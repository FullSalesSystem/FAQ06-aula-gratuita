import { NextRequest, NextResponse } from 'next/server'
import fssPhone from '@/lib/fss-phone'

/* Abandono do popup com e-mail OU WhatsApp válido → contato no GHL com a tag
   'form-incompleto' (sem card, sem tag de trigger, sem SDR). Quem completa
   entra pelo /api/register: o upsert de lá troca o conjunto de tags (tira a
   form-incompleto) e põe a fssflix-cadastro-trigger, que atribui o SDR. */
const LEAD_SOURCE = 'FSSFLIX Gratuito - Aula Gratuita'
const TAGS_INCOMPLETO = ['form-incompleto', 'fssflix-form-incompleto']
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20
const ipBucket = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const entry = ipBucket.get(ip)
  if (!entry || now > entry.resetAt) { ipBucket.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return false }
  entry.count += 1
  return entry.count > MAX_REQUESTS_PER_WINDOW
}

async function ghl(method: string, path: string, body: unknown) {
  const base = (process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com').replace(/\/+$/, '')
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GHL_PIT_TOKEN}`,
      Accept: 'application/json',
      Version: '2021-07-28',
      'Content-Type': 'application/json',
      locationId: process.env.GHL_LOCATION_ID || '',
    },
    body: JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) as { new?: boolean; contact?: { id?: string } } }
}

export async function POST(req: NextRequest) {
  if (isRateLimited(req)) return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  if (!process.env.GHL_PIT_TOKEN || !process.env.GHL_LOCATION_ID) return NextResponse.json({ error: 'server_not_configured' }, { status: 500 })

  /* sendBeacon manda Blob application/json; text() cobre os dois casos */
  let raw: { nome?: unknown; email?: unknown; whatsapp?: unknown } = {}
  try { raw = JSON.parse(await req.text()) } catch {}
  const clean = (v: unknown, n: number) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n)
  const nome = clean(raw.nome, 120)
  const emailRaw = clean(raw.email, 254).toLowerCase()
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : ''
  const tel = fssPhone(clean(raw.whatsapp, 32))
  const phone = tel.ok ? tel.e164 : ''
  if (!email && !phone) return new NextResponse(null, { status: 204 })

  /* upsert SEM `tags` (substituiria o conjunto do contato) e sem campo vazio */
  const body: Record<string, string> = { locationId: process.env.GHL_LOCATION_ID }
  if (nome) {
    const parts = nome.split(' ')
    body.firstName = parts[0]
    if (parts.length > 1) body.lastName = parts.slice(1).join(' ')
  }
  if (email) body.email = email
  if (phone) body.phone = phone

  try {
    const up = await ghl('POST', '/contacts/upsert', body)
    const contactId = up.data?.contact?.id
    if (!up.ok || !contactId) {
      console.error('[ghl] partial upsert failed', { status: up.status })
      return NextResponse.json({ error: 'upstream_rejected' }, { status: 502 })
    }
    if (up.data.new) await ghl('PUT', `/contacts/${contactId}`, { source: LEAD_SOURCE })
    await ghl('POST', `/contacts/${contactId}/tags`, { tags: TAGS_INCOMPLETO })
    console.log('[ghl] partial ok', { contactId, novo: Boolean(up.data.new) })
    return NextResponse.json({ ok: true }, { status: 202 })
  } catch (err) {
    console.error('[ghl] partial threw', { err: (err as Error).message })
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 })
  }
}
