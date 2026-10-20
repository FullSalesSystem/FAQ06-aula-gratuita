/* /api/register: Supabase primeiro + registro no CRM + tags fora do upsert (A10).
   Roda com `node scripts/test-register.mjs` (precisa do typescript do devDependencies; fetch stubado). */
import assert from 'node:assert'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = mkdtempSync(join(tmpdir(), 'faq06-register-'))
const emit = (src, dst, edit = (s) => s) => writeFileSync(join(out, dst), ts.transpileModule(edit(readFileSync(join(root, src), 'utf8')),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)
emit('lib/fss-phone.js', 'fss-phone.mjs')
emit('lib/lead-registro.ts', 'lead-registro.mjs')
emit('app/api/register/route.ts', 'route.mjs', (s) => s
  .replace("from '@/lib/fss-phone'", "from './fss-phone.mjs'")
  .replace("from '@/lib/lead-registro'", "from './lead-registro.mjs'")
  .replace("import { NextRequest, NextResponse } from 'next/server'",
    'type NextRequest = any\nconst NextResponse = { json: (body: any, init?: any) => ({ status: init?.status ?? 200, body }) }'))
const { POST } = await import(join(out, 'route.mjs'))

Object.assign(process.env, { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_ROLE_KEY: 'k', GHL_PIT_TOKEN: 'pit', GHL_LOCATION_ID: 'LOC' })
const BODY = { name: 'Fulana Teste', email: 'F@x.com', phone: '(11) 97425-3168', ddi: '+55', segment: 'Saúde',
  jobTitle: 'Sócio/Empresário', revenue: 'Entre R$50 mil e R$100 mil', utm_source: 'meta', page: 'https://aulagratuita.fullsalessystem.com/' }

async function run(ip, { tagsAntes, leadsFail, closer, tagPostFails = 0 } = {}) {
  const calls = []
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body ? JSON.parse(opts.body) : null })
    const j = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => '' })
    if (String(url).includes('crm.test')) return j(201, { received: true })
    if (leadsFail && String(url).includes('on_conflict=capture_key')) return j(400, { code: 'PGRST204' })
    if (String(url).endsWith('/contacts/upsert')) return j(200, { contact: { id: 'C1', ...(tagsAntes ? { tags: tagsAntes } : {}) } })
    if (String(url).includes('/opportunities/search')) return j(200, { opportunities: closer ? [{ id: 'O1', pipelineId: 'mhe441mBoc0aQkVpwXXN' }] : [] })
    if ((opts.method || 'GET') === 'POST' && String(url).endsWith('/tags') && tagPostFails-- > 0) return j(429, {})
    return j(201, {})
  }
  const req = { json: async () => ({ ...BODY }), headers: { get: (h) => (h === 'x-forwarded-for' ? ip : null) } }
  return { res: await POST(req), calls }
}

/* contato com histórico de outros funis: nada dele some, só classificação velha e form-incompleto */
process.env.CRM_REGISTRO_URL = 'https://crm.test/api/webhooks/inbound/tok'
let { res, calls } = await run('a', { tagsAntes: ['fap1-cadastro', 'playbook-cadastro', 'receita:50k-100k', 'desqualificado', 'form-incompleto'] })
assert.strictEqual(res.status, 200)
const up = calls.find((c) => c.url.endsWith('/contacts/upsert'))
assert.ok(!('tags' in up.body), 'upsert sem tags')
const del = calls.find((c) => c.method === 'DELETE' && c.url.endsWith('/contacts/C1/tags'))
assert.deepStrictEqual(del.body.tags, ['desqualificado', 'form-incompleto'])
const add = calls.find((c) => c.method === 'POST' && c.url.endsWith('/contacts/C1/tags'))
assert.deepStrictEqual(add.body.tags, ['fssflix-cadastro', 'fssflix-cadastro-trigger', 'qualificado',
  'cargo:Sócio/Empresário', 'segmento:Saúde', 'receita:Entre R$50 mil e R$100 mil'], 'mesmas tags e mesmo trigger de antes')
assert.ok(calls.indexOf(up) < calls.indexOf(del) && calls.indexOf(del) < calls.indexOf(add))

/* Supabase primeiro, mesma chave nos dois, mesmo objeto no CRM */
const leads = calls.find((c) => c.url.includes(encodeURIComponent('[Leads] [FAQ06] Pop-Up')))
const cap = calls.find((c) => c.url.endsWith('/rest/v1/lead_capturas'))
const crm = calls.find((c) => c.url.includes('crm.test'))
assert.ok(calls.indexOf(leads) < calls.indexOf(up), 'Supabase antes do GHL')
assert.ok(leads.url.endsWith('?on_conflict=capture_key'))
assert.strictEqual(leads.body.capture_key, cap.body.capture_key)
assert.match(cap.body.capture_key, /^[0-9a-f-]{36}:complete:[0-9a-f]{24}$/)
assert.strictEqual(cap.body.source, 'fssflix')
assert.deepStrictEqual(crm.body, cap.body.capture_payload)
assert.strictEqual(crm.headers['Idempotency-Key'], cap.body.capture_key)
assert.strictEqual(cap.body.capture_payload.contact.phone, '+5511974253168')
assert.ok(!('ghl_tags' in cap.body.capture_payload.attribution.extra))

/* GHL sem tags na resposta: tira a lista fixa (menos a classificação atual); SQL 01 ausente: insert de sempre; sem URL: sem CRM */
delete process.env.CRM_REGISTRO_URL;
({ res, calls } = await run('b', { leadsFail: true }))
assert.deepStrictEqual(calls.find((c) => c.method === 'DELETE').body.tags, ['semiqualificado', 'desqualificado', 'form-incompleto', 'fssflix-form-incompleto', 'reentrada-fssflix', 'prevendas2.0'])
const legado = calls.filter((c) => c.url.endsWith(encodeURIComponent('[Leads] [FAQ06] Pop-Up')))
assert.ok(legado.length === 1 && !('capture_key' in legado[0].body))
assert.ok(!calls.some((c) => c.url.includes('crm.test')))
assert.strictEqual(res.status, 200)

/* reentrada com closer: reentrada-fssflix e prevendas2.0 saem e a reentrada volta por POST (gera 'tag adicionada' como antes) */
;({ res, calls } = await run('c', { closer: true, tagsAntes: ['fssflix-cadastro', 'fssflix-cadastro-trigger', 'qualificado', 'reentrada-fssflix', 'prevendas2.0', 'fap1-cadastro'] }))
const delR = calls.find((c) => c.method === 'DELETE' && c.url.endsWith('/contacts/C1/tags'))
assert.deepStrictEqual(delR.body.tags, ['reentrada-fssflix', 'prevendas2.0'])
const posts = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/contacts/C1/tags'))
assert.strictEqual(posts.length, 2)
assert.deepStrictEqual(posts[1].body.tags, ['reentrada-fssflix'])
assert.ok(calls.indexOf(delR) < calls.indexOf(posts[0]) && calls.indexOf(posts[0]) < calls.indexOf(posts[1]))
assert.ok(!calls.some((c) => c.url.includes('/opportunities') && c.method !== 'GET' && !c.url.includes('search')), 'closer: sem opp nova')

/* POST das tags (trigger do SDR) com 429 duas vezes: tenta de novo e chega */
;({ res, calls } = await run('d', { tagPostFails: 2 }))
const tentativas = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/contacts/C1/tags'))
assert.strictEqual(tentativas.length, 3)
assert.ok(tentativas.every((c) => c.body.tags.includes('fssflix-cadastro-trigger')))
assert.strictEqual(res.status, 200)
console.log('ok test-register')
