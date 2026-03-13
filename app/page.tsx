'use client'

import { useState, useEffect, useRef, useMemo, Suspense, ReactNode, FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

// ─── CONFIGURAR ESTES VALORES ──────────────────────────────────────────────────
const FSSFLIX_URL = 'https://COLOQUE_URL_DO_FSSFLIX_AQUI.curseduca.pro'
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

function LeadPopup({ onClose, onSuccess, utm }: { onClose: () => void; onSuccess: () => void; utm: UtmParams }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', ddi: '+55', jobTitle: '', revenue: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...utm }),
      })
    } catch { /* fail silently */ }
    sessionStorage.setItem('fss_popup', '1')
    sessionStorage.setItem('fss_registered', '1')
    onSuccess()           // libera o vídeo
    onClose()
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.52)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, padding: 'clamp(28px, 5vw, 44px)',
          maxWidth: 460, width: '100%', position: 'relative',
          boxShadow: '0 40px 80px rgba(0,0,0,0.28)',
          animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <img src="/logo-fss.png" alt="Full Sales System" style={{ height: 44, width: 'auto', display: 'block' }} />
        </div>

        <h2 style={{ fontSize: 'clamp(19px, 3vw, 23px)', fontWeight: 800, color: '#0A0A0A', marginBottom: 8, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
          Libere o acesso gratuito ao <span style={{ color: '#E01515' }}>Full Sales Flix</span>
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
          Horas de conteúdo gratuito sobre estruturação comercial, vendas e crescimento  na plataforma da Full Sales System.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
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
                style={{ width: 100, flexShrink: 0, color: '#0A0A0A' }}
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
                style={{ flex: 1 }}
              />
            </div>
            <select
              value={form.jobTitle}
              onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
              required
              style={{ color: form.jobTitle ? '#0A0A0A' : '#9CA3AF' }}
            >
              <option value="" disabled>Seu cargo</option>
              <option value="Sócio ou Fundador">Sócio ou Fundador</option>
              <option value="Empresário ou Empreendedor">Empresário ou Empreendedor</option>
              <option value="Gerente/Head">Gerente/Head</option>
              <option value="Superior/Líder">Superior/Líder</option>
              <option value="Prestador de Serviço/Freelancer">Prestador de Serviço/Freelancer</option>
              <option value="Colaborador/Funcionário">Colaborador/Funcionário</option>
            </select>
            <select
              value={form.revenue}
              onChange={e => setForm(p => ({ ...p, revenue: e.target.value }))}
              required
              style={{ color: form.revenue ? '#0A0A0A' : '#9CA3AF' }}
            >
              <option value="" disabled>Faturamento mensal</option>
              <option value="Abaixo de R$10 mil">Abaixo de R$10 mil</option>
              <option value="Entre R$10 mil a R$30 mil">Entre R$10 mil a R$30 mil</option>
              <option value="Entre R$30 mil a R$100 mil">Entre R$30 mil a R$100 mil</option>
              <option value="Entre R$100 mil a R$500 mil">Entre R$100 mil a R$500 mil</option>
              <option value="Entre R$500 mil a R$1 milhão">Entre R$500 mil a R$1 milhão</option>
              <option value="Mais de R$1 milhão por mês">Mais de R$1 milhão por mês</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', fontSize: 15, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Liberando...' : 'Liberar Acesso Gratuito →'}
          </button>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
            100% gratuito · Sem cartão de crédito · Acesso imediato
          </p>
        </form>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function Navbar({ onOpenPopup }: { onOpenPopup: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
      backgroundColor: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      transition: 'all 0.3s',
    }}>
      <div className="section-container" style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-fss.png" alt="Full Sales System" style={{ height: 36, width: 'auto', display: 'block' }} />
        </div>
        <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 13, padding: '9px 20px', display: 'none' }} id="nav-cta">
          Acessar FSS Flix
        </button>
        <style>{`@media(min-width:640px){#nav-cta{display:inline-flex!important}}`}</style>
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────
   HERO  HEADLINE
───────────────────────────────────────────── */
function HeroSection({ onOpenPopup, hasAccess }: { onOpenPopup: () => void; hasAccess: boolean }) {
  const [active, setActive] = useState(false)
  return (
    <section style={{ paddingTop: 80, paddingBottom: 80, background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500, background: 'radial-gradient(ellipse at 30% top, rgba(224,21,21,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div className="section-container" style={{ position: 'relative', maxWidth: 1200 }}>
        {/* Hero grid: desktop = 2 cols (text-top | video spanning 2 rows, buttons | video)
            mobile  = 1 col  (text-top → video → buttons, source order) */}
        <div id="hero-grid" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 48 }}>

          {/* TEXT TOP  col 1 / row 1 */}
          <div id="hero-text-top" style={{ textAlign: 'left', alignSelf: 'end', maxWidth: 300 }}>
            <h1 className="animate-fade-up" style={{
              animationDelay: '70ms',
              fontSize: 'clamp(22px, 3vw, 40px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#0A0A0A',
              marginBottom: 20,
            }}>
              O conteúdo que já estruturou o comercial de mais de{' '}
              <span style={{ background: 'linear-gradient(90deg, #E01515, #1E52E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                600 empresas
              </span>{' '}
              agora gratuito para você
            </h1>
            <p className="animate-fade-up" style={{
              animationDelay: '140ms',
              fontSize: 'clamp(15px, 1.6vw, 18px)',
              color: '#525252',
              lineHeight: 1.65,
              maxWidth: 300,
            }}>
              Aprenda gratuitamente a construir um sistema comercial com previsibilidade, escala e liberdade com quem fez R$40M em dois anos de operação.
            </p>
          </div>

          {/* VIDEO  col 2 / rows 1+2 (desktop); between text and buttons (mobile via source order) */}
          <FadeUp style={{ gridRow: 'span 2', alignSelf: 'center' }} >
            <div id="hero-video" style={{
              position: 'relative',
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.09)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.11), 0 4px 16px rgba(0,0,0,0.06)',
              background: '#000',
              aspectRatio: '16/9',
            }}>
              {/* Thumbnail + overlay */}
              {!active && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(https://img.youtube.com/vi/8GPRCLbxNRA/maxresdefault.jpg)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  ...(hasAccess ? {} : { filter: 'blur(4px)', transform: 'scale(1.06)' }),
                }} />
              )}
              {!active && (
                <div style={{ position: 'absolute', inset: 0, background: hasAccess ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.62)' }} />
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
                      Liberar Acesso Gratuito <IconArrow />
                    </button>
                  </div>
                </div>
              )}
              {/* Unlocked play state */}
              {hasAccess && !active && (
                <div onClick={() => setActive(true)} style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#E01515', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-ring 2.4s ease infinite' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M8 5.5L21 13L8 20.5V5.5Z" fill="white" /></svg>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>45 min</div>
                  <div style={{ position: 'absolute', top: 12, left: 12, background: '#E01515', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Aula Gratuita</div>
                </div>
              )}
              {/* Active iframe */}
              {active && (
                <iframe src="https://www.youtube.com/embed/8GPRCLbxNRA?autoplay=1&rel=0&modestbranding=1"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              )}
            </div>
          </FadeUp>

          {/* BUTTONS  col 1 / row 2 */}
          <div id="hero-buttons" className="animate-fade-up" style={{ animationDelay: '200ms', display: 'flex', flexWrap: 'wrap', gap: 12, alignSelf: 'start' }}>
            <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>
              Acessar Full Sales Flix <IconArrow />
            </button>
          </div>

        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          #hero-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          #hero-text-top { margin-bottom: 0 !important; }
          #hero-video { grid-row: auto !important; }
        }
      `}</style>
    </section>
  )
}
function FlixCTASection({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <section className="section-pad" style={{ background: '#F8F9FA', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="section-container" style={{ maxWidth: 800, textAlign: 'center' }}>
        <FadeUp>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', lineHeight: 1.1, marginBottom: 18 }}>
            Acesse gratuitamente todo o conteúdo da{' '}
            <span style={{ color: '#E01515' }}>Full Sales System</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#525252', lineHeight: 1.65, maxWidth: 580, margin: '0 auto 36px' }}>
            O Full Sales Flix é a plataforma de conteúdo gratuito da FSS. Aulas, frameworks e playbooks práticos para estruturar seu comercial, disponíveis para você agora.
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
                <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>
              Quero Acessar o FSS Flix <IconArrow />
            </button>
            <a href={YOUTUBE_PLAYLIST_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 14, padding: '14px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconYouTube /> Playlist no YouTube
            </a>
          </div>

          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 14 }}>
            Gratuito · Sem cartão de crédito · Acesso imediato após cadastro
          </p>
        </FadeUp>
      </div>
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
            +550 empresas já atuaram com a Full Sales System
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
    <section className="section-pad" style={{ background: '#F8F9FA', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="section-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'center' }}>
          {/* Photo */}
          <FadeUp>
            <div style={{
              width: '100%', maxWidth: 420, aspectRatio: '4/5',
              borderRadius: 16, position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}>
              <Image
                src="/socios.png"
                alt="Sócios FSS"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 24, right: 24, background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>R$30M</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>no 2º ano</div>
              </div>
            </div>
          </FadeUp>

          {/* Bio */}
          <FadeUp delay={120}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.14, marginBottom: 16 }}>
              A Full Sales System é uma empresa de{' '}
              <span style={{ color: '#E01515' }}>estruturação comercial</span>, não de cursos
            </h2>
            <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.7, marginBottom: 24 }}>
              Fundada por Vinícius de Sá, Yuri Barbosa e Matheus Garcia, a Full Sales System é uma consultoria especializada em equipes comerciais que ajuda empresas a otimizarem o ROI de seus funis de vendas. Com mais de 8 anos de experiência, a FSS acumula mais de 550 empresas aceleradas, mais de R$110 milhões em vendas próprias e mais de R$1 bilhão em faturamento gerado para seus clientes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                'Mais de 550 empresas aceleradas no Brasil, Portugal e EUA em segmentos como advocacia, contabilidade, saúde e tech',
                'Mais de R$1 bilhão em faturamento gerado para empresas aceleradas e mais de R$110 milhões em vendas próprias',
                'NPS de 87 e nota de avaliação 9,44 com foco em resultado real, não só em conteúdo',
                'Metodologia própria de 6 pilares que ativa todos os canais de receita da operação comercial',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <IconCheck />
                  <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.55 }}>{item}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: '+8 anos', desc: 'de experiência' },
                { label: '+550 empresas', desc: 'estruturadas' },
                { label: 'Brasil · Portugal · EUA', desc: 'atuação global' },
              ].map(t => (
                <div key={t.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '7px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{t.desc}</div>
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
    logo: '/estadao-novo.png',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Valor Econômico',
    title: 'Full Sales System aponta o caminho para crescer em 2026 com estratégias mais inteligentes',
    quote: 'Empresas que adotam estruturas de vendas inteligentes e estratégias orgânicas robustas tendem a prosperar em cenários de incerteza, criando vantagem competitiva mesmo com menor investimento direto em mídia.',
    logo: '/press-valor-economico.png',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Pequenas Empresas & Grandes Negócios',
    title: 'Yuri Barbosa, Vinícius de Sá e Matheus Garcia trilharam caminhos distintos, mas marcados pelo mesmo ponto de virada',
    quote: 'Os sócios desenvolveram uma metodologia própria, capaz de integrar processos comerciais eficientes, automação estratégica e construção de autoridade digital. O objetivo não era apenas aumentar vendas, mas criar um modelo de crescimento consistente.',
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
              <div className="card" style={{ padding: '28px 26px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 32, color: '#E01515', fontWeight: 900, lineHeight: 1, marginBottom: 10, fontFamily: 'Georgia, serif' }}>"</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.4, marginBottom: 12 }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, marginBottom: 20, fontStyle: 'italic', flexGrow: 1 }}>
                  {item.quote}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{item.outlet}</p>
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
              <img src="/logo-fss.png" alt="Full Sales System" style={{ height: 40, width: 'auto', display: 'block' }} />
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
            Acessar FSS Flix <IconArrow />
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
        <button onClick={onOpenPopup} className="btn-primary" style={{ width: '100%', fontSize: 15, padding: '15px 24px' }}>
          Acessar Full Sales Flix Gratuitamente <IconArrow />
        </button>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
function HomeContent() {
  const [showPopup, setShowPopup] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
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

  useEffect(() => {
    if (sessionStorage.getItem('fss_registered')) setHasAccess(true)
    if (sessionStorage.getItem('fss_popup')) return
    const t = setTimeout(() => setShowPopup(true), 2000)
    return () => clearTimeout(t)
  }, [])

  const openPopup = () => setShowPopup(true)
  const closePopup = () => setShowPopup(false)
  const handleSuccess = () => setHasAccess(true)

  return (
    <main style={{ backgroundColor: '#FFFFFF', color: '#0A0A0A', overflowX: 'hidden' }}>
      {showPopup && <LeadPopup onClose={closePopup} onSuccess={handleSuccess} utm={utm} />}
      <Navbar onOpenPopup={openPopup} />
      <HeroSection onOpenPopup={openPopup} hasAccess={hasAccess} />
      <FlixCTASection onOpenPopup={openPopup} />
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
