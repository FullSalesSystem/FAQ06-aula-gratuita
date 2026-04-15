import { NextRequest, NextResponse } from 'next/server'

// O fluxo n8n (com integrações Curseduca) pode levar >15s.
// Default do Vercel Hobby é 10s; estendemos para 60s.
export const maxDuration = 60

/**
 * POST /api/register
 *
 * Recebe { name, email, phone } do popup da landing page,
 * cria o membro na Curseduca e o matricula no conteúdo do FSS Flix.
 *
 * Variáveis de ambiente necessárias (.env.local):
 *   CURSEDUCA_API_KEY      — chave de API (Settings > Integrações)
 *   CURSEDUCA_BEARER_TOKEN — Bearer token (se exigido pela conta)
 *   CURSEDUCA_GROUP_ID     — ID do grupo/turma para adicionar o membro
 *   CURSEDUCA_CONTENT_ID   — ID do conteúdo para matricular (opcional)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { name, email, phone, ddi, jobTitle, revenue, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body as {
    name?: string
    email?: string
    phone?: string
    ddi?: string
    jobTitle?: string
    revenue?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Nome e e-mail são obrigatórios.' },
      { status: 400 }
    )
  }

  // ── Webhook FSS ──────────────────────────────────────────────────────────────
  const fullPhone = ddi && phone ? `${ddi}${phone}` : phone
  const webhookPayload = {
    name,
    email,
    phone: fullPhone,
    jobTitle,
    revenue,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  }

  // Aguarda até 45s pela resposta do n8n. O fluxo no n8n é longo
  // (inclui integrações Curseduca) e pode demorar >15s antes de
  // retornar a variável `url_acesso`.
  let urlAcesso: string | undefined
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    const webhookRes = await fetch('https://responsefss.fullsalessystem.com.br/webhook/e44e7b84-7751-48e9-aaab-1f250c02b40b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    console.log('[register] Webhook response status:', webhookRes.status)

    // Lê o corpo como texto primeiro pra conseguirmos diagnosticar
    // tanto respostas JSON quanto texto puro / HTML / vazio.
    const rawBody = await webhookRes.text()
    console.log('[register] Webhook raw body:', rawBody.slice(0, 2000))

    if (webhookRes.ok && rawBody) {
      try {
        const data = JSON.parse(rawBody)
        const payload = Array.isArray(data) ? data[0] : data
        urlAcesso =
          payload?.url_acesso ||
          payload?.urlAcesso ||
          payload?.access_url ||
          payload?.url ||
          payload?.data?.url_acesso ||
          payload?.json?.url_acesso
        if (urlAcesso) {
          console.log('[register] url_acesso recebida do n8n:', urlAcesso)
        } else {
          console.warn('[register] n8n respondeu sem url_acesso. payload=', JSON.stringify(payload))
        }
      } catch (e) {
        console.error('[register] Webhook JSON parse error:', (e as Error).message, '| body=', rawBody.slice(0, 500))
      }
    }
  } catch (err) {
    const e = err as Error
    console.error('[register] Webhook error:', e.name, '|', e.message)
  }

  const apiKey = process.env.CURSEDUCA_API_KEY
  const bearerToken = process.env.CURSEDUCA_BEARER_TOKEN
  const groupId = process.env.CURSEDUCA_GROUP_ID
  const contentId = process.env.CURSEDUCA_CONTENT_ID

  // ── Curseduca não configurado ─────────────────────────────────────────────
  // O lead ainda é captado normalmente; apenas o registro automático é omitido.
  if (!apiKey || !groupId) {
    console.warn('[register] Curseduca não configurado. Lead recebido:', {
      name,
      email,
      phone: ddi && phone ? `${ddi}${phone}` : phone,
      jobTitle,
      revenue,
      utm: { utm_source, utm_medium, utm_campaign, utm_content, utm_term },
    })
    return NextResponse.json({ ok: true, note: 'curseduca_not_configured', url_acesso: urlAcesso })
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  }
  if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`

  // ── 1. Criar membro ───────────────────────────────────────────────────────
  try {
    const memberPayload: Record<string, unknown> = {
      name,
      email,
      groupId: Number(groupId),
    }
    if (phone) memberPayload.phone = ddi ? `${ddi}${phone}` : phone

    const memberRes = await fetch('https://prof.curseduca.pro/members', {
      method: 'POST',
      headers,
      body: JSON.stringify(memberPayload),
    })

    // 201 = criado | 409 = já existe — ambos são OK
    if (memberRes.status !== 201 && memberRes.status !== 409) {
      const errorText = await memberRes.text()
      console.error('[register] Curseduca /members error:', memberRes.status, errorText)
      // Retornamos ok mesmo assim para não bloquear o usuário
      return NextResponse.json({ ok: true, note: 'member_creation_failed', url_acesso: urlAcesso })
    }

    // ── 2. Matricular no conteúdo (opcional) ─────────────────────────────
    if (contentId) {
      const enrollRes = await fetch('https://clas.curseduca.pro/enrollments', {
        method: 'POST',
        headers,
        body: JSON.stringify({ member: email, contentId: Number(contentId) }),
      })

      if (enrollRes.status !== 201 && enrollRes.status !== 409) {
        const enrollErr = await enrollRes.text()
        console.error('[register] Curseduca /enrollments error:', enrollRes.status, enrollErr)
        // Não bloqueia — membro já foi criado
      }
    }

    return NextResponse.json({ ok: true, url_acesso: urlAcesso })
  } catch (err) {
    console.error('[register] Fetch error:', err)
    // Falha silenciosa: não bloquear o usuário por erro de integração
    return NextResponse.json({ ok: true, note: 'fetch_error', url_acesso: urlAcesso })
  }
}
