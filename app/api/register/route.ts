import { NextRequest, NextResponse } from 'next/server'

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
  const { name, email, phone, ddi, jobTitle, revenue } = body as {
    name?: string
    email?: string
    phone?: string
    ddi?: string
    jobTitle?: string
    revenue?: string
  }

  if (!name || !email) {
    return NextResponse.json(
      { error: 'Nome e e-mail são obrigatórios.' },
      { status: 400 }
    )
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
    })
    return NextResponse.json({ ok: true, note: 'curseduca_not_configured' })
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
      return NextResponse.json({ ok: true, note: 'member_creation_failed' })
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[register] Fetch error:', err)
    // Falha silenciosa: não bloquear o usuário por erro de integração
    return NextResponse.json({ ok: true, note: 'fetch_error' })
  }
}
