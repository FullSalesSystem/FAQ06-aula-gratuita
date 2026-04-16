'use client'

import { useState, useEffect, useRef, useMemo, Suspense, ReactNode, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

// ─── CONFIGURAR ESTES VALORES ──────────────────────────────────────────────────
const FSSFLIX_URL = 'https://fullsalessystem.curseduca.pro/m/courses?tenant=1773430344485'
const YOUTUBE_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLzJ4B1s6bJZ2DL9jhvEgx2ANhwi6LiQk_'
// ──────────────────────────────────────────────────────────────────────────────

/* ────────────────────────────────────────────
   INTERSECTION OBSERVER HOOK
───────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.unobserve(entry.target) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function FadeUp({ children, delay = 0, style = {} }: { children: ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(28px)', transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
function IconArrow() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function IconYouTube() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
}
function IconCheck() {
  return <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}><circle cx="10" cy="10" r="10" fill="rgba(224,21,21,0.1)"/><path d="M6 10.5L8.8 13L14 7" stroke="#E01515" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="tag" style={{ marginBottom: 16 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E01515', display: 'inline-block' }} />
      {text}
    </div>
  )
}

/* ─────────────────────────────────────────────
   LEAD POPUP
───────────────────────────────────────────── */
interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

/** Mensagens progressivas mostradas durante a submissão (~22s).
 *  Cada entrada define o tempo mínimo (em segundos) em que fica ativa. */
const LOADING_STAGES = [
  { at: 0,  title: 'Enviando seus dados...',            subtitle: 'Estamos validando suas informações.' },
  { at: 4,  title: 'Criando seu acesso...',              subtitle: 'Configurando seu perfil no Full Sales Flix.' },
  { at: 10, title: 'Preparando seu ambiente...',         subtitle: 'Matriculando você nos conteúdos gratuitos.' },
  { at: 17, title: 'Estamos quase lá...',                subtitle: 'Só mais alguns instantes para liberar seu acesso.' },
]
/** Duração esperada (em segundos) para calcular a barra de progresso. */
const LOADING_EXPECTED_SECONDS = 22

function LeadPopup({ onClose, onSuccess, utm }: { onClose: () => void; onSuccess: (urlAcesso?: string) => void; utm: UtmParams }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', ddi: '+55', jobTitle: '', revenue: '', segment: '' })
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [step, setStep] = useState(1)

  // Conta segundos desde o início do loading para alternar mensagens
  // e mover a barra de progresso.
  useEffect(() => {
    if (!loading) { setElapsed(0); return }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  const currentStage = LOADING_STAGES.reduce(
    (acc, stage) => (elapsed >= stage.at ? stage : acc),
    LOADING_STAGES[0]
  )

  const handleNext = (e: FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    let urlAcesso: string | undefined
    try {
      // O n8n leva ~10s para processar e retornar a `url_acesso`.
      // O fetch aguarda naturalmente pela resposta (timeout de 15s no server).
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utm }),
      })
      const data = await res.json().catch(() => ({}))
      if (typeof data?.url_acesso === 'string' && data.url_acesso) {
        urlAcesso = data.url_acesso
      }
    } catch { /* fail silently */ }
    sessionStorage.setItem('fss_popup', '1')
    sessionStorage.setItem('fss_registered', '1')
    if (urlAcesso) {
      try { sessionStorage.setItem('fss_access_url', urlAcesso) } catch {}
    }
    onSuccess(urlAcesso)
    onClose()
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, padding: 'clamp(24px, 4vw, 36px)',
          maxWidth: 520, width: '100%', position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.28)',
          animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {loading ? (
          <LoadingView stage={currentStage} elapsed={elapsed} />
        ) : (<>
        {/* Header: logo + step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <img src="/logo-fss.png" alt="Full Sales System" style={{ height: 38, width: 'auto', display: 'block' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                width: n === step ? 20 : 8, height: 8, borderRadius: 4,
                background: n === step ? '#E01515' : n < step ? '#E01515' : '#E5E7EB',
                transition: 'all 0.3s',
              }} />
            ))}
            <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>{step}/2</span>
          </div>
        </div>

        <h2 style={{ fontSize: 'clamp(17px, 2.4vw, 21px)', fontWeight: 800, color: '#0A0A0A', marginBottom: 6, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
          Libere seu acesso gratuito ao <span style={{ color: '#E01515' }}>Full Sales Flix</span>
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18, lineHeight: 1.5 }}>
          Cadastre-se uma única vez e tenha acesso a horas de conteúdo gratuito sobre estruturação comercial, vendas e crescimento na plataforma da Full Sales System.
        </p>

        {/* ETAPA 1 */}
        {step === 1 && (
          <form onSubmit={handleNext}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <input
                type="text" placeholder="Seu nome completo"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
              />
              <input
                type="email" placeholder="Seu melhor e-mail"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={form.ddi}
                  onChange={e => setForm(p => ({ ...p, ddi: e.target.value }))}
                  style={{ width: 90, flexShrink: 0, color: '#0A0A0A' }}
                >
                  <option value="+55">🇧🇷 +55</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+39">🇮🇹 +39</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+61">🇦🇺 +61</option>
                  <option value="+54">🇦🇷 +54</option>
                  <option value="+56">🇨🇱 +56</option>
                  <option value="+57">🇨🇴 +57</option>
                  <option value="+52">🇲🇽 +52</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>
                <input
                  type="tel" placeholder="WhatsApp com DDD"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 15 }}>
              Continuar →
            </button>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              Ao informar meus dados, eu concordo com os{' '}
              <a href="https://fss.fullsalessystem.com/termos-de-uso" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'underline' }}>termos de uso</a>
              {' '}e{' '}
              <a href="https://fss.fullsalessystem.com/politicas-de-privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'underline' }}>Política de privacidade</a>.
            </p>
          </form>
        )}

        {/* ETAPA 2 */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <select
                value={form.segment}
                onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
                required
                style={{ color: form.segment ? '#0A0A0A' : '#9CA3AF' }}
              >
                <option value="" disabled>Segmento</option>
                <option value="Serviço">Serviço</option>
                <option value="Varejo">Varejo</option>
                <option value="Mentoria">Mentoria</option>
                <option value="Indústria">Indústria</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Educação">Educação</option>
                <option value="Imobiliária">Imobiliária</option>
                <option value="Finanças">Finanças</option>
                <option value="Franquia/Franchising">Franquia/Franchising</option>
                <option value="Saúde">Saúde</option>
                <option value="SAAS">SAAS</option>
                <option value="Telecom">Telecom</option>
                <option value="Turismo">Turismo</option>
                <option value="Outro">Outro</option>
              </select>
              <select
                value={form.jobTitle}
                onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                required
                style={{ color: form.jobTitle ? '#0A0A0A' : '#9CA3AF' }}
              >
                <option value="" disabled>Cargo</option>
                <option value="Sócio/Empresário">Sócio/Empresário</option>
                <option value="Gerente/Líder">Gerente/Líder</option>
                <option value="Colaborador/Funcionário">Colaborador/Funcionário</option>
                <option value="Prestador de serviço/Freelancer">Prestador de serviço/Freelancer</option>
              </select>
              <select
                value={form.revenue}
                onChange={e => setForm(p => ({ ...p, revenue: e.target.value }))}
                required
                style={{ color: form.revenue ? '#0A0A0A' : '#9CA3AF' }}
              >
                <option value="" disabled>Qual a sua receita mensal aproximada?</option>
                <option value="Abaixo de R$30 mil">Abaixo de R$30 mil</option>
                <option value="Entre R$30 mil e R$50 mil">Entre R$30 mil e R$50 mil</option>
                <option value="Entre R$50 mil e R$100 mil">Entre R$50 mil e R$100 mil</option>
                <option value="Entre R$100 mil e R$300 mil">Entre R$100 mil e R$300 mil</option>
                <option value="Entre R$300 mil e R$500 mil">Entre R$300 mil e R$500 mil</option>
                <option value="Entre R$500 mil e R$1 milhão">Entre R$500 mil e R$1 milhão</option>
                <option value="Acima de R$1 milhão">Acima de R$1 milhão</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, fontSize: 15, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Liberando...' : 'Acesse gratuitamente o Full Sales Flix →'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              Ao informar meus dados, eu concordo com os{' '}
              <a href="https://fss.fullsalessystem.com/termos-de-uso" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'underline' }}>termos de uso</a>
              {' '}e{' '}
              <a href="https://fss.fullsalessystem.com/politicas-de-privacidade" target="_blank" rel="noopener noreferrer" style={{ color: '#6B7280', textDecoration: 'underline' }}>Política de privacidade</a>.
            </p>
          </form>
        )}
        </>)}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   LOADING VIEW (exibida durante a submissão ~22s)
───────────────────────────────────────────── */
function LoadingView({ stage, elapsed }: { stage: { title: string; subtitle: string }; elapsed: number }) {
  const progress = Math.min((elapsed / LOADING_EXPECTED_SECONDS) * 100, 96)
  return (
    <div style={{ textAlign: 'center', padding: '12px 4px 4px' }}>
      {/* Logo */}
      <img
        src="/logo-fss.png"
        alt="Full Sales System"
        style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 26px' }}
      />

      {/* Spinner vermelho */}
      <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 28px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '4px solid rgba(224, 21, 21, 0.12)',
          borderTop: '4px solid #E01515',
          borderRadius: '50%',
          animation: 'fss-spin 0.95s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 14,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,21,21,0.18) 0%, rgba(224,21,21,0) 70%)',
          animation: 'fss-pulse 1.8s ease-in-out infinite',
        }} />
      </div>

      {/* Mensagem progressiva — key força re-render p/ disparar animação */}
      <h3
        key={stage.title}
        style={{
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          fontWeight: 800,
          color: '#0A0A0A',
          marginBottom: 8,
          letterSpacing: '-0.025em',
          lineHeight: 1.3,
          animation: 'fss-fade-in 0.45s ease both',
        }}
      >
        {stage.title}
      </h3>
      <p
        key={stage.subtitle}
        style={{
          fontSize: 14,
          color: '#6B7280',
          margin: '0 auto 26px',
          maxWidth: 380,
          lineHeight: 1.55,
          animation: 'fss-fade-in 0.45s ease 0.05s both',
        }}
      >
        {stage.subtitle}
      </p>

      {/* Barra de progresso */}
      <div style={{
        width: '100%',
        height: 6,
        background: '#F3F4F6',
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 14,
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #E01515 0%, #FF3B3B 100%)',
          borderRadius: 999,
          transition: 'width 0.9s ease',
        }} />
      </div>

      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4, lineHeight: 1.5 }}>
        Por favor, não feche esta janela. Isso leva cerca de {LOADING_EXPECTED_SECONDS} segundos.
      </p>

      <style>{`
        @keyframes fss-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fss-pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes fss-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function Navbar({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      backgroundColor: '#0F1627',
      transition: 'all 0.3s',
    }}>
      <div className="section-container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-fss-branco.png" alt="Full Sales System" style={{ height: 36, width: 'auto', display: 'block' }} />
        </div>
        <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 13, padding: '9px 20px', display: 'none' }} id="nav-cta">
          Acesse gratuitamente o Full Sales Flix
        </button>
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   HERO  HEADLINE
───────────────────────────────────────────── */
function HeroSection({ onOpenPopup, hasAccess }: { onOpenPopup: () => void; hasAccess: boolean }) {
  const [active, setActive] = useState(false)
  const vturbScriptLoaded = useRef(false)

  useEffect(() => {
    if (active && !vturbScriptLoaded.current) {
      vturbScriptLoaded.current = true
      const s = document.createElement('script')
      s.src = 'https://scripts.converteai.net/c678e70b-13db-47d3-b046-f3e247d16ff7/players/69c6fec17141a7eb85a55367/v4/player.js'
      s.async = true
      document.head.appendChild(s)
    }
  }, [active])

  return (
    <section id="hero-section" style={{
      paddingTop: 120, paddingBottom: 80,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="section-container" style={{ position: 'relative', maxWidth: 1200 }}>
        {/* Hero grid: desktop = 2 cols (left: text+button flex | right: video matching height)
            mobile  = 1 col  (text → video → button, source order) */}
        <div id="hero-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 40, alignItems: 'stretch' }}>

          {/* LEFT COL: text + button stacked */}
          <div id="hero-left" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24, minHeight: 420 }}>
            <div id="hero-text-top" style={{ textAlign: 'left' }}>
              <h1 className="animate-fade-up" style={{
                animationDelay: '70ms',
                fontSize: 'clamp(19px, 2.3vw, 30px)',
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                color: '#FFFFFF',
                marginBottom: 12,
              }}>
                Descubra como empresários comuns estão{' '}
                <span style={{ color: '#E01515' }}>
                  estruturando o processo comercial das suas empresas do zero
                </span>
                , e parando de depender de improviso para vender
              </h1>
              <p className="animate-fade-up" style={{
                animationDelay: '140ms',
                fontSize: 'clamp(14px, 1.6vw, 18px)',
                color: '#C7D0E0',
                lineHeight: 1.6,
              }}>
                O Full Sales Flix é a plataforma completa com todo o conteúdo que já estruturou o processo comercial de mais de 600 empresas.
              </p>
            </div>

            {/* BUTTONS */}
            <div id="hero-buttons" className="animate-fade-up" style={{ animationDelay: '200ms', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 17, padding: '15px 28px', width: '100%' }}>
                Acesse gratuitamente o Full Sales Flix <IconArrow />
              </button>
              <p style={{ fontSize: 13, color: '#8893A8', textAlign: 'center', margin: 0 }}>
                Gratuito · Acesso imediato
              </p>
            </div>
          </div>

          {/* VIDEO  col 2 — proporção 16:9 para que a thumb fique perfeita */}
          <FadeUp style={{ alignSelf: 'center', width: '100%' }} >
            <div id="hero-video" style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.09)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)',
              background: '#000',
            }}>
              {/* Thumbnail + overlay */}
              {!active && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(/thumb-aula-gratuita.png)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
              )}
              {!active && (
                <div style={{ position: 'absolute', inset: 0, background: hasAccess ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.30)' }} />
              )}
              {/* Locked state */}
              {!hasAccess && !active && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, zIndex: 2 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2" fill="white" fillOpacity="0.9" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(14px, 2vw, 17px)', marginBottom: 6, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                      Preencha o cadastro para assistir
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 18 }}>Acesso gratuito e imediato</p>
                    <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 13, padding: '11px 24px' }}>
                      Acesse gratuitamente o Full Sales Flix <IconArrow />
                    </button>
                  </div>
                </div>
              )}
              {/* Unlocked play state */}
              {hasAccess && !active && (
                <div onClick={() => setActive(true)} style={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 2 }}>
                  <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translate(-50%, -50%)', width: 68, height: 68, borderRadius: '50%', background: '#E01515', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-ring 2.4s ease infinite' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}>
                    <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M8 5.5L21 13L8 20.5V5.5Z" fill="white" /></svg>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>45 min</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#E01515', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Aula Gratuita</div>
                </div>
              )}
              {/* Active vturb player */}
              {active && (
                <vturb-smartplayer
                  id="vid-69c6fec17141a7eb85a55367"
                  style={{ display: 'block', margin: '0 auto', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                />
              )}
            </div>
          </FadeUp>


        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          #hero-section { padding-top: 96px !important; padding-bottom: 56px !important; }
          #hero-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          #hero-left { gap: 18px !important; min-height: 0 !important; }
          #hero-buttons button { font-size: 15px !important; padding: 13px 20px !important; }
        }
      `}</style>
    </section>
  )
}
function FlixCTASection({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <section id="flix-cta-section" className="section-pad" style={{ position: 'relative' }}>
      <div className="section-container" style={{ maxWidth: 1000, textAlign: 'center' }}>
        <FadeUp>
          <h2 style={{ fontSize: 'clamp(22px, 3.2vw, 36px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', lineHeight: 1.18, marginBottom: 18 }}>
            O mesmo sistema que gerou{' '}
            <span style={{ color: '#E01515' }}>R$40M em 2 anos de operação</span>
            {' '}e mais de{' '}
            <span style={{ color: '#E01515' }}>R$500M para nossos clientes</span>
            {' '}agora está disponível gratuitamente para você
          </h2>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#C7D0E0', lineHeight: 1.65, maxWidth: 620, margin: '0 auto 36px' }}>
            Aulas, frameworks e playbooks práticos para estruturar seu comercial, disponíveis para você agora.
          </p>

          {/* Features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 40, textAlign: 'left', maxWidth: 640, margin: '0 auto 40px' }}>
            {[
              'Aulas de estruturação comercial',
              'Estudos de caso',
              'Processos de vendas e entrega',
              'Playbook interno de Estruturação Comercial',
              'Guia prático de Social Selling',
              'Acesso imediato e gratuito',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconCheck />
                <span style={{ fontSize: 14, color: '#E5E9F2', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <button onClick={onOpenPopup} className="btn-primary" id="flix-cta-btn" style={{ fontSize: 16, padding: '16px 40px' }}>
              Acesse gratuitamente o Full Sales Flix <IconArrow />
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#8893A8', marginTop: 14 }}>
            Gratuito · Acesso imediato
          </p>
        </FadeUp>
      </div>
      <style>{`
        @media (max-width: 768px) {
          #flix-cta-btn { font-size: 14px !important; padding: 14px 22px !important; width: 100%; max-width: 360px; }
        }
      `}</style>
    </section>
  )
}

/* ─────────────────────────────────────────────
   QUEM CONFIA NA FSS
───────────────────────────────────────────── */

const clientLogos = [
  { src: '/cliente-ajs.png',       name: 'AJS' },
  { src: '/cliente-dm.png',        name: 'DM' },
  { src: '/cliente-hotelaria.png', name: 'Hotelaria' },
  { src: '/cliente-instituto.png', name: 'Instituto' },
  { src: '/cliente-kaizen.png',    name: 'Kaizen' },
  { src: '/cliente-maximus.png',   name: 'Maximus' },
  { src: '/cliente-mbi.png',       name: 'MBI' },
  { src: '/cliente-mental.png',    name: 'Mental One' },
  { src: '/cliente-perpetuo.png',  name: 'Perpétuo' },
  { src: '/cliente-positiva.png',  name: 'Positiva' },
  { src: '/cliente-salvus.png',    name: 'Salvus' },
  { src: '/cliente-taugor.png',    name: 'Taugor' },
  { src: '/cliente-ticto.png',     name: 'Ticto' },
  { src: '/cliente-tio.png',       name: 'Tio' },
]
const areas1 = [
  { icon: '🏢', text: 'Empresarial' },
  { icon: '📢', text: 'Marketing' },
  { icon: '🎤', text: 'Eventos' },
  { icon: '⚕️', text: 'Médicos' },
  { icon: '💡', text: 'Mentoria / Consultoria' },
  { icon: '⚖️', text: 'Advocacia' },
  { icon: '🏪', text: 'Franquia' },
  { icon: '💰', text: 'Financeiro' },
  { icon: '🎨', text: 'Branding / Posicionamento' },
  { icon: '🏭', text: 'Serviços / Indústria' },
]
const areas2 = [
  { icon: '💬', text: 'Comercial' },
  { icon: '📊', text: 'Contábil / Tributário' },
  { icon: '💆', text: 'Saúde Estética' },
  { icon: '☁️', text: 'SAAS (Software as Service)' },
  { icon: '⚡', text: 'Energia Solar' },
  { icon: '💻', text: 'Software House' },
  { icon: '📱', text: 'Mercado Digital' },
  { icon: '📡', text: 'Comunicação' },
  { icon: '🏗️', text: 'Civil / Imobiliário' },
  { icon: '🎓', text: 'Educação' },
]

function TrustSection() {
  return (
    <section className="section-pad" style={{ background: '#FFFFFF' }}>
      <div className="section-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.12 }}>
            Mais de 600 empresas já atuaram com a Full Sales System
          </h2>
          <p style={{ color: '#6B7280', fontSize: 16, marginTop: 12, maxWidth: 520, margin: '12px auto 0' }}>
            De escritórios de advocacia a empresas de tecnologia, em todos os segmentos
          </p>
        </FadeUp>
        <FadeUp delay={80}>
          <div style={{ overflow: 'hidden', marginBottom: 56, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #fff, transparent)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #fff, transparent)', zIndex: 1, pointerEvents: 'none' }} />
            <div className="marquee-track">
              {[...clientLogos, ...clientLogos].map((logo, i) => (
                <div key={i} style={{ flexShrink: 0, width: 160, height: 72, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginRight: 12 }}>
                  <Image src={logo.src} alt={logo.name} width={136} height={48} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
        <FadeUp delay={120}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h3 style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 700, color: '#0A0A0A', marginBottom: 6 }}>
              Áreas que <strong>já atuamos</strong>
            </h3>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Independente do segmento, o sistema funciona.</p>
          </div>
          <style>{`
            @keyframes fss-left { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 8px)); } }
            @keyframes fss-right { 0% { transform: translateX(calc(-50% - 8px)); } 100% { transform: translateX(0); } }
            .fss-row { display:flex; gap:14px; width:max-content; }
            .fss-row-1 { animation: fss-left 28s linear infinite; }
            .fss-row-2 { animation: fss-right 28s linear infinite; }
            .fss-overflow { overflow:hidden; width:100%; position:relative; padding: 6px 0; }
            .fss-card { display:inline-flex; align-items:center; gap:10px; background:#1a1a1a; color:#fff; padding:12px 20px; border-radius:10px; white-space:nowrap; flex-shrink:0; font-size:14px; font-weight:500; }
          `}</style>
          <div className="fss-overflow">
            <div className="fss-row fss-row-1">
              {[...areas1, ...areas1].map((a, i) => (
                <div key={i} className="fss-card"><span>{a.icon}</span><span>{a.text}</span></div>
              ))}
            </div>
          </div>
          <div className="fss-overflow" style={{ marginTop: 12 }}>
            <div className="fss-row fss-row-2">
              {[...areas2, ...areas2].map((a, i) => (
                <div key={i} className="fss-card"><span>{a.icon}</span><span>{a.text}</span></div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section className="section-pad" style={{
      backgroundColor: '#0F1627',
      backgroundImage: 'url(/background-fss.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      <div className="section-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'center' }}>
          {/* Photo */}
          <FadeUp>
            <div style={{
              width: '100%', maxWidth: 420, aspectRatio: '4/5',
              borderRadius: 16, position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            }}>
              <Image
                src="/socios.png"
                alt="Sócios FSS"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)', pointerEvents: 'none' }} />
            </div>
          </FadeUp>

          {/* Bio */}
          <FadeUp delay={120}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', lineHeight: 1.14, marginBottom: 16 }}>
              A Full Sales System é uma empresa de{' '}
              <span style={{ color: '#E01515' }}>estruturação comercial</span>, não de cursos
            </h2>
            <p style={{ fontSize: 15, color: '#C7D0E0', lineHeight: 1.7, marginBottom: 24 }}>
              Fundada por Vinícius de Sá, Yuri Barbosa e Matheus Garcia, a Full Sales System é uma consultoria especializada em equipes comerciais que ajuda empresas a otimizarem o ROI de seus funis de vendas. Com mais de 8 anos de experiência, a FSS acumula mais de 600 empresas aceleradas, mais de R$110 milhões em vendas próprias e mais de R$1 bilhão em faturamento gerado para seus clientes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                'Mais de 600 empresas aceleradas no Brasil, Portugal e EUA em segmentos como advocacia, contabilidade, saúde e tech',
                'Mais de R$1 bilhão em faturamento gerado para empresas aceleradas e mais de R$110 milhões em vendas próprias',
                'NPS de 87 e nota de avaliação 9,44 com foco em resultado real, não só em conteúdo',
                'Metodologia própria de 6 pilares que ativa todos os canais de receita da operação comercial',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <IconCheck />
                  <p style={{ fontSize: 14, color: '#C7D0E0', lineHeight: 1.55 }}>{item}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   SESSÃO DE IMPRENSA
───────────────────────────────────────────── */

const pressItems = [
  {
    outlet: 'Estadão',
    title: 'Full Sales System: três mentes empreendedoras que transformaram desafios em estratégias',
    quote: 'Nos últimos anos, ajudamos os nossos clientes a girar mais de 500 milhões de faturamento em vendas. Mas quando olhamos para esses números enxergamos algo ainda maior: não foi só o aumento nas vendas, mas eles se tornaram protagonistas da própria empresa.',
    image: '/press-foto-estadao.webp',
    logo: '/estadao-novo.png',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Valor Econômico',
    title: 'Full Sales System aponta o caminho para crescer em 2026 com estratégias mais inteligentes',
    quote: 'Empresas que adotam estruturas de vendas inteligentes e estratégias orgânicas robustas tendem a prosperar em cenários de incerteza, criando vantagem competitiva mesmo com menor investimento direto em mídia.',
    image: '/press-foto-valor-economico.webp',
    logo: '/press-valor-economico.png',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Pequenas Empresas & Grandes Negócios',
    title: 'Yuri Barbosa, Vinícius de Sá e Matheus Garcia trilharam caminhos distintos, mas marcados pelo mesmo ponto de virada',
    quote: 'Os sócios desenvolveram uma metodologia própria, capaz de integrar processos comerciais eficientes, automação estratégica e construção de autoridade digital. O objetivo não era apenas aumentar vendas, mas criar um modelo de crescimento consistente.',
    image: '/press-foto-pequenas-empresas.webp',
    logo: '/press-pequenas-empresas.png',
    logoBg: '#D35400',
  },
]

const pressLogos = [
  { name: 'Valor Econômico', src: '/press-valor-economico.png', bg: '#FFFFFF', scale: 1.2 },
  { name: 'Pequenas Empresas & Grandes Negócios', src: '/press-pequenas-empresas.png', bg: '#D35400', scale: 2.3 },
  { name: 'Band', src: '/press-band.png', bg: '#1A1A1A', scale: 1 },
  { name: 'Estadão', src: '/estadao-novo.png', bg: '#FFFFFF', scale: 2.0 },
  { name: 'Terra', src: '/press-terra.png', bg: '#FFFFFF', scale: 1.0 },
]

function PressSection() {
  return (
    <section className="section-pad" style={{ background: '#FFFFFF' }}>
      <div className="section-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.12 }}>
            Full Sales System na Mídia
          </h2>
          <p style={{ color: '#6B7280', fontSize: 16, marginTop: 12, maxWidth: 480, margin: '12px auto 0' }}>
            Como a imprensa fala sobre a metodologia da Full Sales System
          </p>
        </FadeUp>

        {/* Press logos strip  desktop: flex wrap | mobile: marquee */}
        <FadeUp delay={60}>
          {/* Desktop */}
          <div id="press-logos-desktop" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
            {pressLogos.map((logo, i) => (
              <div key={i} style={{ height: 72, width: 180, background: logo.bg, border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Image src={logo.src} alt={logo.name} width={156} height={48} style={{ objectFit: 'contain', width: '100%', height: '100%', transform: `scale(${logo.scale})`, transformOrigin: 'center center' }} />
              </div>
            ))}
          </div>
          {/* Mobile: marquee carousel */}
          <div id="press-logos-mobile" style={{ overflow: 'hidden', marginBottom: 48, position: 'relative', display: 'none' }}>
            <div className="marquee-track" style={{ animationDuration: '18s' }}>
              {[...pressLogos, ...pressLogos].map((logo, i) => (
                <div key={i} style={{ flexShrink: 0, height: 64, width: 150, background: logo.bg, border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginRight: 12 }}>
                  <Image src={logo.src} alt={logo.name} width={130} height={44} style={{ objectFit: 'contain', width: '100%', height: '100%', transform: `scale(${logo.scale})`, transformOrigin: 'center center' }} />
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* Press quote cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {pressItems.map((item, i) => (
            <FadeUp key={i} delay={i * 80}>
              <div className="card" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 11',
                  backgroundImage: `url(${item.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'top center',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }} />
                <div style={{ padding: '24px 26px 28px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: 32, color: '#E01515', fontWeight: 900, lineHeight: 1, marginBottom: 10, fontFamily: 'Georgia, serif' }}>"</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.4, marginBottom: 12 }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic', flexGrow: 1 }}>
                    {item.quote}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{item.outlet}</p>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          #press-logos-desktop { display: none !important; }
          #press-logos-mobile { display: block !important; }
        }
      `}</style>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FOOTER (dark)
───────────────────────────────────────────── */
function Footer({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <footer style={{ background: '#0A0A0A', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 0 40px' }}>
      <div className="section-container">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 40, marginBottom: 48 }}>
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="/logo-fss-branco.png" alt="Full Sales System" style={{ height: 40, width: 'auto', display: 'block' }} />
            </div>
            <p style={{ fontSize: 14, color: '#71717A', lineHeight: 1.65 }}>
              Estruturação comercial para empresas que já faturam e querem crescer com processo e previsibilidade.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#71717A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Conteúdo</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Full Sales Flix', action: () => onOpenPopup() },
                  { label: 'YouTube  Comercial Faixa Preta', href: YOUTUBE_PLAYLIST_URL },
                ].map((l) => (
                  l.action
                    ? <button key={l.label} onClick={l.action} style={{ background: 'none', border: 'none', padding: 0, fontSize: 14, color: '#A1A1AA', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#A1A1AA')}>{l.label}</button>
                    : <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#A1A1AA', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#A1A1AA')}>{l.label}</a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA strip */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(224,21,21,0.1) 0%, rgba(30,82,232,0.08) 100%)',
          border: '1px solid rgba(224,21,21,0.2)',
          borderRadius: 14, padding: '26px 32px',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 36,
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 17, color: '#fff', marginBottom: 4 }}>Pronto para acessar o conteúdo gratuito?</p>
            <p style={{ fontSize: 13, color: '#A1A1AA' }}>Crie sua conta gratuita no Full Sales Flix agora.</p>
          </div>
          <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 14 }}>
            Acesse gratuitamente o Full Sales Flix <IconArrow />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 13, color: '#52525B' }}>© {new Date().getFullYear()} Full Sales System. Todos os direitos reservados. CNPJ 51.843.626/0001-09</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <a href="https://fss.fullsalessystem.com/politicas-de-privacidade?utm_source=go.fullsalessystem.com&sck=go.fullsalessystem.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#52525B', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#A1A1AA')} onMouseLeave={e => (e.currentTarget.style.color = '#52525B')}>Política de Privacidade</a>
              <a href="https://fss.fullsalessystem.com/termos-de-uso?utm_source=go.fullsalessystem.com&sck=go.fullsalessystem.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#52525B', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = '#A1A1AA')} onMouseLeave={e => (e.currentTarget.style.color = '#52525B')}>Termos de Uso</a>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#52525B' }}>Feito para empresários que constroem de verdade.</p>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────
   STICKY MOBILE CTA
───────────────────────────────────────────── */
function StickyMobileCTA({ onOpenPopup }: { onOpenPopup: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <>
      <style>{`@media(min-width:768px){#sticky-cta{display:none!important}}`}</style>
      <div
        id="sticky-cta"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
          padding: '12px 20px 20px',
          background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <button onClick={onOpenPopup} className="btn-primary" style={{ width: '100%', fontSize: 15, padding: '15px 24px', display: 'none' }}>
          Acesse gratuitamente o Full Sales Flix <IconArrow />
        </button>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────
   EXIT INTENT POPUP
───────────────────────────────────────────── */
function ExitIntentPopup({ onClose, onCTA }: { onClose: () => void; onCTA: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#0F1627',
          backgroundImage: 'url(/background-fss.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: 16,
          padding: 'clamp(24px, 3.2vw, 36px) clamp(20px, 3.2vw, 32px)',
          maxWidth: 500, width: '100%', position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
          textAlign: 'center',
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)',
            padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Logo */}
        <img
          src="/logo-fss-branco.png"
          alt="Full Sales System"
          style={{ height: 44, width: 'auto', margin: '0 auto 22px', display: 'block' }}
        />

        {/* Title */}
        <h2 style={{
          fontSize: 'clamp(19px, 2.6vw, 26px)',
          fontWeight: 800,
          color: '#FFFFFF',
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
          marginBottom: 14,
        }}>
          Não vá embora antes de acessar gratuitamente o{' '}
          <span style={{ color: '#E01515' }}>Full Sales Flix</span>
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(13px, 1.4vw, 15px)',
          color: '#C7D0E0',
          lineHeight: 1.55,
          marginBottom: 24,
          maxWidth: 400,
          margin: '0 auto 24px',
        }}>
          Tenha acesso a horas de conteúdo gratuito sobre estruturação comercial, vendas e crescimento para o seu negócio.
        </p>

        {/* CTA button */}
        <button
          onClick={onCTA}
          id="exit-intent-cta"
          className="btn-primary"
          style={{
            fontSize: 'clamp(11px, 1.3vw, 13px)',
            padding: '14px 22px',
            borderRadius: 999,
            width: '100%',
            maxWidth: 380,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          Acesse gratuitamente o Full Sales Flix →
        </button>

        {/* Below button */}
        <p style={{ fontSize: 12, color: '#8893A8', marginTop: 12 }}>
          Gratuito • Acesso imediato
        </p>
      </div>
      <style>{`
        @media (max-width: 480px) {
          #exit-intent-cta { white-space: normal !important; letter-spacing: 0 !important; padding: 14px 18px !important; }
        }
      `}</style>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
function HomeContent() {
  const [hasAccess, setHasAccess] = useState(() => {
    try { return !!sessionStorage.getItem('fss_registered') } catch { return false }
  })
  const [accessUrl, setAccessUrl] = useState<string>(() => {
    try { return sessionStorage.getItem('fss_access_url') || FSSFLIX_URL } catch { return FSSFLIX_URL }
  })
  const [showExitIntent, setShowExitIntent] = useState(false)
  const [exitIntentUsed, setExitIntentUsed] = useState(false)
  const searchParams = useSearchParams()

  const utm = useMemo<UtmParams>(() => {
    const params: UtmParams = {}
    const s = searchParams.get('utm_source'); if (s) params.utm_source = s
    const m = searchParams.get('utm_medium'); if (m) params.utm_medium = m
    const c = searchParams.get('utm_campaign'); if (c) params.utm_campaign = c
    const co = searchParams.get('utm_content'); if (co) params.utm_content = co
    const t = searchParams.get('utm_term'); if (t) params.utm_term = t
    return params
  }, [searchParams])

  // UTM efetiva: quando o exit-intent foi usado, marca utm_content=faq06-popup
  // (preserva qualquer utm_source original do anúncio)
  const effectiveUtm = useMemo<UtmParams>(() => {
    return exitIntentUsed ? { ...utm, utm_content: 'faq06-popup' } : utm
  }, [utm, exitIntentUsed])

  // Exit intent: dispara 1x por sessão quando o mouse sai pelo topo
  // (e só se o usuário ainda não estiver cadastrado)
  useEffect(() => {
    if (hasAccess) return
    try { if (sessionStorage.getItem('fss_exit_intent_shown') === '1') return } catch {}

    let fired = false
    const handler = (e: MouseEvent) => {
      if (fired) return
      // mouse saiu pela parte de cima da viewport (intenção de fechar a aba)
      if (e.clientY <= 0) {
        fired = true
        try { sessionStorage.setItem('fss_exit_intent_shown', '1') } catch {}
        setShowExitIntent(true)
      }
    }
    document.documentElement.addEventListener('mouseleave', handler)
    return () => document.documentElement.removeEventListener('mouseleave', handler)
  }, [hasAccess])

  const openPopup = () => {
    if (hasAccess) window.open(accessUrl, '_blank')
  }
  const handleSuccess = (urlAcesso?: string) => {
    if (urlAcesso) setAccessUrl(urlAcesso)
    setHasAccess(true)
  }
  const handleExitIntentCTA = () => {
    setExitIntentUsed(true)
    setShowExitIntent(false)
  }

  return (
    <main style={{ backgroundColor: '#FFFFFF', color: '#0A0A0A', overflowX: 'hidden' }}>
      {!hasAccess && <LeadPopup onClose={() => {}} onSuccess={handleSuccess} utm={effectiveUtm} />}
      {showExitIntent && !hasAccess && (
        <ExitIntentPopup onClose={() => setShowExitIntent(false)} onCTA={handleExitIntentCTA} />
      )}
      <Navbar onOpenPopup={openPopup} />
      {/* Wrapper com background estendido da secao 1 ate a secao 2 */}
      <div style={{
        backgroundColor: '#0F1627',
        backgroundImage: 'url(/background-fss.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <HeroSection onOpenPopup={openPopup} hasAccess={hasAccess} />
        <FlixCTASection onOpenPopup={openPopup} />
      </div>
      <TrustSection />
      <AboutSection />
      <PressSection />
      <Footer onOpenPopup={openPopup} />
      <StickyMobileCTA onOpenPopup={openPopup} />
    </main>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
