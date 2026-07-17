import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/register — FAQ06 FSSFLIX Gratuito
 *
 * Substitui o webhook n8n [FAQ06] Curseduca por integração direta:
 *   1) Supabase       — grava lead em [Leads] [Isca Gratuita] FSSFLIX
 *   2) HighLevel (GHL) — upsert contato, source, nota, tags, oportunidade
 *   3) Curseduca      — search/create/update + add ao grupo + deep-link
 *
 * Retorna { ok, url_acesso, classificacao } — page.tsx consome url_acesso
 * pra redirecionar direto ao conteúdo autenticado.
 *
 * ManyChat NÃO é chamado nesse fluxo (FSSFLIX é isca de vídeo, não WhatsApp).
 */

export const runtime = 'nodejs'
export const maxDuration = 60

/* ─── Identidade FSSFLIX Gratuito ────────────────────────────── */
const LEAD_SOURCE      = 'FSSFLIX Gratuito - Aula Gratuita'
const SUPABASE_TABLE   = '[Leads] [FAQ06] Pop-Up'
const TAG_CADASTRO     = 'fssflix-cadastro'
const TAG_TRIGGER      = 'fssflix-cadastro-trigger'
const TAG_REENTRADA    = 'reentrada-fssflix'

/* ─── Pipelines GHL (mesma location FUoQ8Kefs7Wj8cbgdJnS) ────── */
const CLOSERS_PIPELINE_ID                  = 'mhe441mBoc0aQkVpwXXN'
const PRE_SALES_PIPELINE_ID                = 'jg6YojszvhB88pE7Uhmw'
const PRE_SALES_STAGE_FUNIL_AQUISICAO_ID   = 'db826122-011f-459b-8ccf-80b285238f9b'

/* ─── Curseduca (do n8n [FAQ06] Curseduca) ───────────────────── */
const CURSEDUCA_BASE_URL_DEFAULT   = 'https://prof.curseduca.pro'
const CURSEDUCA_GROUP_ID           = 3
const CURSEDUCA_DEFAULT_PASSWORD   = 'fss1234'
const CURSEDUCA_TAG                = 'FSSFLIX'
const CURSEDUCA_DEEPLINK_BASE      = 'https://fullsalessystem.curseduca.pro/deeplink/'
const CURSEDUCA_LOGIN_FALLBACK     = 'https://fullsalessystem.curseduca.pro/login'

/* ─── Rate limit em memória (best-effort em serverless) ──────── */
const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 10
const ipBucket = new Map<string, { count: number; resetAt: number }>()

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff && xff.length > 0) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipBucket.get(ip)
  if (!entry || now > entry.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_REQUESTS_PER_WINDOW
}

function sanitizeText(value: unknown, maxLen: number): string {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLen)
}

function splitName(fullName: string) {
  const parts = fullName.split(' ').filter(Boolean)
  return {
    firstName: parts[0] || 'Lead',
    lastName:  parts.slice(1).join(' '),
  }
}

/* ─── Classificação (régua FSS: Sócio + 50k+ = qualificado) ──── */
type Classificacao = 'qualificado' | 'semiqualificado' | 'desqualificado'

const RECEITA_50K_PLUS = new Set([
  'Entre R$50 mil e R$100 mil',
  'Entre R$100 mil e R$300 mil',
  'Entre R$300 mil e R$500 mil',
  'Entre R$500 mil e R$1 milhão',
  'Acima de R$1 milhão',
])
const RECEITA_30_50K = 'Entre R$30 mil e R$50 mil'

function classifyLead(jobTitle: string, revenue: string): Classificacao {
  const isSocio = jobTitle === 'Sócio/Empresário'
  if (isSocio && RECEITA_50K_PLUS.has(revenue)) return 'qualificado'
  if (isSocio && revenue === RECEITA_30_50K)    return 'semiqualificado'
  return 'desqualificado'
}

/* ─── Payload validado ────────────────────────────────────────── */

interface LeadPayload {
  nome: string
  email: string
  whatsapp: string          // +5511999998888
  whatsappDigits: string    // 5511999998888
  cargo: string
  segmento: string
  receita: string
  page: string
  submittedAt: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
}

interface RawInput {
  name?: string; email?: string; phone?: string; ddi?: string
  segment?: string; jobTitle?: string; revenue?: string
  utm_source?: string; utm_medium?: string; utm_campaign?: string
  utm_content?: string; utm_term?: string
  page?: string; submitted_at?: string
}

function normalizePayload(raw: RawInput, referer: string): LeadPayload | null {
  const nome = sanitizeText(raw.name, 120)
  const email = sanitizeText(raw.email, 254).toLowerCase()
  if (nome.length < 2) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null

  const ddi   = sanitizeText(raw.ddi, 6) || '+55'
  const phone = sanitizeText(raw.phone, 24).replace(/\D/g, '')
  const whatsapp = phone ? `${ddi.startsWith('+') ? ddi : '+' + ddi}${phone}` : ''
  const whatsappDigits = whatsapp.replace(/\D/g, '')

  return {
    nome,
    email,
    whatsapp,
    whatsappDigits,
    cargo:     sanitizeText(raw.jobTitle, 60),
    segmento:  sanitizeText(raw.segment, 60),
    receita:   sanitizeText(raw.revenue, 60),
    page:      sanitizeText(raw.page || referer, 500),
    submittedAt: sanitizeText(raw.submitted_at, 40) || new Date().toISOString(),
    utm_source:   sanitizeText(raw.utm_source, 120),
    utm_medium:   sanitizeText(raw.utm_medium, 120),
    utm_campaign: sanitizeText(raw.utm_campaign, 200),
    utm_content:  sanitizeText(raw.utm_content, 200),
    utm_term:     sanitizeText(raw.utm_term, 200),
  }
}

/* ═══════════════════════════════════════════════════════════════
   Supabase
   ═══════════════════════════════════════════════════════════════ */

async function sendToSupabase(url: string, key: string, p: LeadPayload) {
  const endpoint = `${url.replace(/\/+$/, '')}/rest/v1/${encodeURIComponent(SUPABASE_TABLE)}`
  const row = {
    nome: p.nome,
    email: p.email,
    telefone: p.whatsapp,
    cargo: p.cargo,
    segmento: p.segmento,
    faturamento: p.receita,
    utm_source: p.utm_source,
    utm_medium: p.utm_medium,
    utm_campaign: p.utm_campaign,
    utm_content: p.utm_content,
    utm_term: p.utm_term,
    url: p.page,
    data: p.submittedAt,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.error('[supabase] insert failed', { status: res.status, err: err.slice(0, 300) })
  } else {
    console.log('[supabase] insert ok', { status: res.status })
  }
  return res.ok
}

/* ═══════════════════════════════════════════════════════════════
   GHL / HighLevel
   ═══════════════════════════════════════════════════════════════ */

function ghlHeaders(pit: string, locationId: string) {
  return {
    Authorization: `Bearer ${pit}`,
    Accept: 'application/json',
    Version: '2021-07-28',
    locationId,
    'Content-Type': 'application/json',
  }
}

function buildGhlPayload(p: LeadPayload, locationId: string) {
  const { firstName, lastName } = splitName(p.nome)
  const classificacao = classifyLead(p.cargo, p.receita)
  return {
    locationId,
    firstName,
    lastName,
    name: p.nome,
    email: p.email,
    phone: p.whatsapp,
    source: LEAD_SOURCE,
    tags: [
      TAG_CADASTRO,
      TAG_TRIGGER,
      classificacao,
      `cargo:${p.cargo}`,
      `segmento:${p.segmento}`,
      `receita:${p.receita}`,
    ],
  }
}

async function ghlUpsertContact(base: string, pit: string, locationId: string, p: LeadPayload) {
  const res = await fetch(`${base.replace(/\/+$/, '')}/contacts/upsert`, {
    method: 'POST',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify(buildGhlPayload(p, locationId)),
  })
  const data = await res.json().catch(() => null) as { contact?: { id?: string; assignedTo?: string } } | null
  return { ok: res.ok, status: res.status, contactId: data?.contact?.id, assignedTo: data?.contact?.assignedTo }
}

async function ghlSearchContactOpportunities(base: string, pit: string, locationId: string, contactId: string) {
  const qs = new URLSearchParams({ location_id: locationId, contact_id: contactId, limit: '100' })
  const res = await fetch(`${base.replace(/\/+$/, '')}/opportunities/search?${qs}`, {
    method: 'GET',
    headers: ghlHeaders(pit, locationId),
  })
  const data = await res.json().catch(() => null) as { opportunities?: Array<{ id: string; pipelineId: string; pipelineStageId: string; source?: string }> } | null
  if (!res.ok || !data?.opportunities) return []
  return data.opportunities
}

function buildNoteBody(p: LeadPayload): string {
  const classificacao = classifyLead(p.cargo, p.receita)
  const lines = [
    'Cadastro FSSFLIX Gratuito — Aula Gratuita',
    '',
    `• Segmento: ${p.segmento}`,
    `• Perfil: ${p.cargo}`,
    `• Receita mensal: ${p.receita}`,
    '',
    `Classificação: ${classificacao}`,
    `Página: ${p.page}`,
    `Enviado em: ${p.submittedAt}`,
  ]
  const utms = [
    p.utm_source   && `source=${p.utm_source}`,
    p.utm_medium   && `medium=${p.utm_medium}`,
    p.utm_campaign && `campaign=${p.utm_campaign}`,
    p.utm_content  && `content=${p.utm_content}`,
    p.utm_term     && `term=${p.utm_term}`,
  ].filter(Boolean)
  if (utms.length) lines.push('', `UTMs: ${utms.join(' | ')}`)
  return lines.join('\n')
}

async function ghlAddNote(base: string, pit: string, locationId: string, contactId: string, userId: string, body: string) {
  const payload = userId ? { userId, body } : { body }
  const res = await fetch(`${base.replace(/\/+$/, '')}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify(payload),
  })
  if (!res.ok) console.error('[ghl] note failed', { status: res.status })
  return res.ok
}

async function ghlAddTags(base: string, pit: string, locationId: string, contactId: string, tags: string[]) {
  const res = await fetch(`${base.replace(/\/+$/, '')}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify({ tags }),
  })
  return res.ok
}

async function ghlUpdateContactSource(base: string, pit: string, locationId: string, contactId: string) {
  const res = await fetch(`${base.replace(/\/+$/, '')}/contacts/${contactId}`, {
    method: 'PUT',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify({ source: LEAD_SOURCE }),
  })
  return res.ok
}

async function ghlCreateOpportunity(base: string, pit: string, locationId: string, contactId: string, name: string) {
  const res = await fetch(`${base.replace(/\/+$/, '')}/opportunities/`, {
    method: 'POST',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify({
      locationId,
      contactId,
      pipelineId: PRE_SALES_PIPELINE_ID,
      pipelineStageId: PRE_SALES_STAGE_FUNIL_AQUISICAO_ID,
      status: 'open',
      name,
      source: LEAD_SOURCE,
    }),
  })
  return res.ok
}

async function ghlMoveOpportunity(base: string, pit: string, locationId: string, opportunityId: string) {
  const res = await fetch(`${base.replace(/\/+$/, '')}/opportunities/${opportunityId}`, {
    method: 'PUT',
    headers: ghlHeaders(pit, locationId),
    body: JSON.stringify({
      pipelineId: PRE_SALES_PIPELINE_ID,
      pipelineStageId: PRE_SALES_STAGE_FUNIL_AQUISICAO_ID,
      source: LEAD_SOURCE,
    }),
  })
  return res.ok
}

/* ═══════════════════════════════════════════════════════════════
   Curseduca (transcrito do n8n [FAQ06] Curseduca.json)
   ═══════════════════════════════════════════════════════════════ */

interface CurseducaMember {
  id: number
  uuid: string
  name?: string
  email?: string
}

function parseBrazilianPhone(digits: string) {
  return {
    countryCode: digits.substring(0, 2),
    areaCode:    digits.substring(2, 4),
    number:      digits.substring(4),
  }
}

function curseducaHeaders(apiKey: string, token: string) {
  const bearer = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  return {
    api_key: apiKey,
    Authorization: bearer,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

/** GET /members/by?email=... — retorna { id, uuid, ... } ou null se 404 */
async function curseducaSearchByEmail(base: string, apiKey: string, token: string, email: string): Promise<CurseducaMember | null> {
  const url = `${base.replace(/\/+$/, '')}/members/by?email=${encodeURIComponent(email)}`
  const res = await fetch(url, { method: 'GET', headers: curseducaHeaders(apiKey, token) })
  if (res.status === 404) return null
  if (!res.ok) {
    console.error('[curseduca] search failed', { status: res.status })
    return null
  }
  return await res.json().catch(() => null) as CurseducaMember | null
}

/** POST /api/v1/members — cria membro com senha padrão + tag FSSFLIX + grupo 3 */
async function curseducaCreateMember(base: string, apiKey: string, token: string, p: LeadPayload): Promise<CurseducaMember | null> {
  const phone = parseBrazilianPhone(p.whatsappDigits)
  const body = {
    name: p.nome,
    email: p.email,
    password: CURSEDUCA_DEFAULT_PASSWORD,
    tag: CURSEDUCA_TAG,
    group: { id: CURSEDUCA_GROUP_ID },
    sendMemberRegisteredEmail: true,
    phones: { mobile: phone },
  }
  const res = await fetch(`${base.replace(/\/+$/, '')}/api/v1/members`, {
    method: 'POST',
    headers: curseducaHeaders(apiKey, token),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null) as CurseducaMember | null
  if (!res.ok) {
    console.error('[curseduca] create failed', { status: res.status })
    return null
  }
  console.log('[curseduca] member created', { id: data?.id, email: p.email })
  return data
}

/** PATCH /members/{id} — atualiza nome/telefone */
async function curseducaUpdateMember(base: string, apiKey: string, token: string, memberId: number, p: LeadPayload) {
  const phone = parseBrazilianPhone(p.whatsappDigits)
  const body = {
    name: p.nome,
    email: p.email,
    document: '',
    phones: { mobile: phone },
  }
  const res = await fetch(`${base.replace(/\/+$/, '')}/members/${memberId}`, {
    method: 'PATCH',
    headers: curseducaHeaders(apiKey, token),
    body: JSON.stringify(body),
  })
  if (!res.ok) console.error('[curseduca] update failed', { status: res.status })
  return res.ok
}

/** POST /members/groups — adiciona ao grupo 3 (idempotente do lado deles) */
async function curseducaAddToGroup(base: string, apiKey: string, token: string, memberId: number, memberUuid: string) {
  const body = {
    member: { id: memberId, uuid: memberUuid, role: 'string' },
    group: { id: CURSEDUCA_GROUP_ID },
    customExpirationDate: '',
  }
  const res = await fetch(`${base.replace(/\/+$/, '')}/members/groups`, {
    method: 'POST',
    headers: curseducaHeaders(apiKey, token),
    body: JSON.stringify(body),
  })
  if (!res.ok) console.error('[curseduca] addToGroup failed', { status: res.status })
  return res.ok
}

/** POST /api/v1/deep-links — retorna URL final ou fallback pra /login */
async function curseducaGenerateDeepLink(base: string, apiKey: string, token: string, memberId: number): Promise<string> {
  try {
    const res = await fetch(`${base.replace(/\/+$/, '')}/api/v1/deep-links`, {
      method: 'POST',
      headers: curseducaHeaders(apiKey, token),
      body: JSON.stringify({ memberId }),
    })
    const data = await res.json().catch(() => null) as { token?: string } | null
    if (res.ok && data?.token) return `${CURSEDUCA_DEEPLINK_BASE}${data.token}`
    console.warn('[curseduca] deeplink sem token', { status: res.status })
  } catch (err) {
    console.error('[curseduca] deeplink threw', { err: (err as Error).message })
  }
  return CURSEDUCA_LOGIN_FALLBACK
}

/**
 * Espelha o fluxo n8n:
 *   SearchContact ─┬─ (exists) → AttContact → Add_Group_Contact → Gerar DeepLink
 *                  └─ (404)    → CreatContact → Gerar DeepLink1
 * Retorna a url_acesso (deep-link ou fallback).
 */
async function syncCurseduca(p: LeadPayload): Promise<string> {
  const base   = process.env.CURSEDUCA_BASE_URL || CURSEDUCA_BASE_URL_DEFAULT
  const apiKey = process.env.CURSEDUCA_API_KEY
  const token  = process.env.CURSEDUCA_TOKEN || process.env.CURSEDUCA_BEARER_TOKEN
  if (!apiKey || !token) {
    console.warn('[curseduca] env missing — pulando', { hasKey: !!apiKey, hasToken: !!token })
    return CURSEDUCA_LOGIN_FALLBACK
  }

  const existing = await curseducaSearchByEmail(base, apiKey, token, p.email)
  let memberId: number | undefined

  if (existing?.id) {
    console.log('[curseduca] member exists', { id: existing.id, email: p.email })
    await curseducaUpdateMember(base, apiKey, token, existing.id, p)
    await curseducaAddToGroup(base, apiKey, token, existing.id, existing.uuid)
    memberId = existing.id
  } else {
    const created = await curseducaCreateMember(base, apiKey, token, p)
    memberId = created?.id
  }

  if (!memberId) return CURSEDUCA_LOGIN_FALLBACK
  return await curseducaGenerateDeepLink(base, apiKey, token, memberId)
}

/* ═══════════════════════════════════════════════════════════════
   HANDLER
   ═══════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
  }

  const raw = await req.json().catch(() => ({})) as RawInput
  const referer = req.headers.get('referer') || ''
  const payload = normalizePayload(raw, referer)
  if (!payload) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  console.log('[lead] recebido', {
    email: payload.email,
    cargo: payload.cargo,
    receita: payload.receita,
    classificacao: classifyLead(payload.cargo, payload.receita),
    utm_source: payload.utm_source,
    utm_campaign: payload.utm_campaign,
  })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const pitToken    = process.env.GHL_PIT_TOKEN
  const locationId  = process.env.GHL_LOCATION_ID
  const ghlBaseUrl  = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com'
  const ghlUserId   = process.env.GHL_USER_ID || ''

  /* 1. Supabase (não bloqueia) */
  if (supabaseUrl && supabaseKey) {
    try { await sendToSupabase(supabaseUrl, supabaseKey, payload) }
    catch (err) { console.error('[supabase] threw', { err: (err as Error).message }) }
  } else {
    console.warn('[supabase] env missing', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey })
  }

  /* 2. GHL — upsert + source + note + tags/opportunity (não bloqueia) */
  if (pitToken && locationId) {
    try {
      const { ok, contactId, assignedTo } = await ghlUpsertContact(ghlBaseUrl, pitToken, locationId, payload)
      if (!ok) {
        console.error('[ghl] upsert failed')
      } else if (contactId) {
        await ghlUpdateContactSource(ghlBaseUrl, pitToken, locationId, contactId)
        try {
          const noteUserId = ghlUserId || assignedTo || ''
          await ghlAddNote(ghlBaseUrl, pitToken, locationId, contactId, noteUserId, buildNoteBody(payload))
        } catch (err) { console.error('[ghl] note threw', { err: (err as Error).message }) }

        const opps = await ghlSearchContactOpportunities(ghlBaseUrl, pitToken, locationId, contactId)
        const hasCloser = opps.some(o => o.pipelineId === CLOSERS_PIPELINE_ID)
        if (hasCloser) {
          await ghlAddTags(ghlBaseUrl, pitToken, locationId, contactId, [TAG_REENTRADA])
        } else {
          const preSales = opps.find(o => o.pipelineId === PRE_SALES_PIPELINE_ID)
          if (preSales) {
            if (
              preSales.pipelineStageId !== PRE_SALES_STAGE_FUNIL_AQUISICAO_ID ||
              preSales.source !== LEAD_SOURCE
            ) {
              await ghlMoveOpportunity(ghlBaseUrl, pitToken, locationId, preSales.id)
            }
          } else {
            await ghlCreateOpportunity(ghlBaseUrl, pitToken, locationId, contactId, payload.nome)
          }
        }
      }
    } catch (err) {
      console.error('[ghl] threw', { err: (err as Error).message })
    }
  } else {
    console.warn('[ghl] env missing', { hasPit: !!pitToken, hasLocation: !!locationId })
  }

  /* 3. Curseduca — retorna url_acesso (deep-link) que a page.tsx consome */
  let urlAcesso = CURSEDUCA_LOGIN_FALLBACK
  try {
    urlAcesso = await syncCurseduca(payload)
  } catch (err) {
    console.error('[curseduca] threw', { err: (err as Error).message })
  }

  return NextResponse.json({
    ok: true,
    url_acesso: urlAcesso,
    classificacao: classifyLead(payload.cargo, payload.receita),
  })
}
