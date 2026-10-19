/* Contrato "Supabase primeiro" (19/10/2026) para funil SÓ REGISTRO.
   ~/crm-pre-vendas-fss/entrada-leads-1910/CONTRATO-SUPABASE-PRIMEIRO.md, seção 10.
   Gêmeo de api/_lead-registro.js do fap01-google.

   1. Supabase antes de tudo, em paralelo e com timeout de 3 s: lead_capturas (corpo
      capture v1 exato) + a linha [Leads] de sempre com capture_key. Sem o SQL 01
      (coluna/índice ausente) a linha cai no insert de sempre.
   2. POST capture v1 de REGISTRO no CRM (create_deal=false, sem espelho, sem
      marketing, sem ghl_tags). Nunca rejeita; só roda com CRM_REGISTRO_URL. */
import { createHash } from 'node:crypto'

const TIMEOUT_MS = 3000

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }
const sort = (v: any): any => Array.isArray(v) ? v.map(sort)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v

export interface Capture {
  schema_version: 1
  submission_id: string
  submitted_at: string
  contact: { name?: string; email?: string; phone?: string }
  answers: Record<string, Json>
  qualification: Record<string, { raw: string; currency?: string; period?: string }>
  attribution: Record<string, unknown> & { extra: { source_submission_id: string; phase: 'complete' } }
}

/* Mesmo envelope e mesma chave do _crm-capture.js: <base>:complete:<sha256(answers)[:24]> */
export function buildCapture(
  raw: Record<string, unknown>,
  p: { nome: string; email: string; whatsapp: string },
  o: { base: string; submittedAt: string; role?: string; segment?: string; revenue?: string },
): Capture {
  const answers = JSON.parse(JSON.stringify(raw))
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(o.base)) throw new Error('invalid_submission_id')
  if (!Number.isFinite(Date.parse(o.submittedAt))) throw new Error('invalid_submitted_at')
  const contact: Capture['contact'] = {}
  if (p.nome) contact.name = p.nome
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '')) contact.email = p.email.toLowerCase()
  const phone = String(p.whatsapp || '').replace(/\D/g, '')
  if (/^[1-9]\d{7,14}$/.test(phone)) contact.phone = '+' + phone
  if (!contact.email && !contact.phone) throw new Error('invalid_contact')
  const qualification: Capture['qualification'] = {}
  if (o.revenue) qualification.revenue = { raw: o.revenue, currency: 'BRL', period: 'monthly' }
  if (o.role) qualification.role = { raw: o.role }
  if (o.segment) qualification.segment = { raw: o.segment }
  const attribution: Capture['attribution'] = { extra: { source_submission_id: o.base, phase: 'complete' } }
  if (typeof raw.page === 'string' && /^https?:\/\//.test(raw.page)) attribution.page_url = raw.page
  for (const k of ['referrer', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (typeof raw[k] === 'string' && raw[k]) attribution[k] = raw[k]
  }
  const hash = createHash('sha256').update(JSON.stringify(sort(answers))).digest('hex').slice(0, 24)
  return {
    schema_version: 1, submission_id: `${o.base}:complete:${hash}`,
    submitted_at: new Date(o.submittedAt).toISOString(), contact, answers, qualification, attribution,
  }
}

type Resultado = { ok: boolean; status: number; code: string }

async function post(url: string, key: string, path: string, prefer: string, body: unknown): Promise<Resultado> {
  try {
    const r = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const code = r.ok ? '' : String(((await r.json().catch(() => ({}))) as { code?: string }).code || '')
    return { ok: r.ok, status: r.status, code }
  } catch (err) {
    return { ok: false, status: 0, code: (err as Error)?.name || 'erro' }
  }
}

/* capture null (não deu pra montar) => só a linha de sempre, sem capture_key. */
export async function gravarSupabase(a: {
  url: string; key: string; table: string; row: Record<string, unknown>; capture: Capture | null; source: string
}) {
  const t = encodeURIComponent(a.table)
  const legado = () => post(a.url, a.key, t, 'return=minimal', a.row)
  const linha = async () => {
    if (!a.capture) return legado()
    const r = await post(a.url, a.key, `${t}?on_conflict=capture_key`, 'resolution=ignore-duplicates,return=minimal',
      { ...a.row, capture_key: a.capture.submission_id })
    /* PGRST204 = coluna capture_key não existe; 42P10 = falta o índice único. SQL 01 não rodou. */
    return r.status === 400 && (r.code === 'PGRST204' || r.code === '42P10') ? legado() : r
  }
  const [lead, captura] = await Promise.all([
    linha(),
    a.capture ? post(a.url, a.key, 'lead_capturas', 'resolution=ignore-duplicates,return=minimal', {
      capture_key: a.capture.submission_id, source: a.source, capture_phase: 'complete', capture_payload: a.capture,
    }) : Promise.resolve<Resultado>({ ok: false, status: 0, code: 'sem_capture' }),
  ])
  const key = a.capture?.submission_id ?? null;
  (lead.ok ? console.log : console.error)('[supabase] leads', { ...lead, key });
  (captura.ok ? console.log : console.error)('[supabase] lead_capturas', { ...captura, key })
  return { lead, captura }
}

/* Nunca rejeita. Sem CRM_REGISTRO_URL => não chama nada (gate do deploy). */
export function registrarNoCrm(capture: Capture | null): Promise<{ ok: boolean; status: number }> {
  const url = process.env.CRM_REGISTRO_URL || ''
  if (!capture || !/^https:\/\//.test(url)) return Promise.resolve({ ok: false, status: 0 })
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': capture.submission_id },
    body: JSON.stringify(capture),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  }).then(async r => {
    const ok = r.ok && ((await r.json().catch(() => ({}))) as { received?: boolean }).received === true;
    (ok ? console.log : console.error)('[crm-registro]', { ok, status: r.status, key: capture.submission_id })
    return { ok, status: r.status }
  }).catch(err => {
    console.error('[crm-registro] erro', { name: (err as Error)?.name, key: capture.submission_id })
    return { ok: false, status: 0 }
  })
}
