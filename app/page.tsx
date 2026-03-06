'use client'

import { useState, useEffect, useRef, ReactNode, FormEvent } from 'react'
import Image from 'next/image'

// ─── CONFIGURAR ESTES VALORES ──────────────────────────────────────────────────
const FSSFLIX_URL = 'https://COLOQUE_URL_DO_FSSFLIX_AQUI.curseduca.pro'
const YOUTUBE_PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLzJ4B1s6bJZ2DL9jhvEgx2ANhwi6LiQk_'
// ──────────────────────────────────────────────────────────────────────────────

/* ─────────────────────────────────────────────
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
function LeadPopup({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch { /* fail silently */ }
    sessionStorage.setItem('fss_popup', '1')
    sessionStorage.setItem('fss_registered', '1')
    onSuccess()           // libera o vídeo
    window.open(FSSFLIX_URL, '_blank')
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
          <div style={{ width: 34, height: 34, background: '#1E52E8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 13 }}>FS</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0A0A0A' }}>Full Sales Flix</span>
        </div>

        <h2 style={{ fontSize: 'clamp(19px, 3vw, 23px)', fontWeight: 800, color: '#0A0A0A', marginBottom: 8, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
          Libere o acesso gratuito ao <span style={{ color: '#E01515' }}>Full Sales Flix</span>
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
          Horas de conteúdo gratuito sobre estruturação comercial, vendas e crescimento — na plataforma da Full Sales System.
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
            <input
              type="tel" placeholder="WhatsApp com DDD"
              value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required
            />
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
          <div style={{ width: 28, height: 28, background: '#1E52E8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff' }}>FS</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0A0A0A', letterSpacing: '-0.01em' }}>Full Sales System</span>
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
   HERO — HEADLINE
───────────────────────────────────────────── */
function HeroSection({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <section style={{ paddingTop: 120, paddingBottom: 64, background: '#FFFFFF', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 420, background: 'radial-gradient(ellipse at center top, rgba(224,21,21,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div className="section-container" style={{ position: 'relative', maxWidth: 860 }}>
        <div className="animate-fade-up" style={{ animationDelay: '0ms', marginBottom: 24, display: 'inline-block' }}>
          <span className="tag">
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E01515', display: 'inline-block' }} />
            Full Sales System
          </span>
        </div>

        <h1
          className="animate-fade-up"
          style={{
            animationDelay: '70ms',
            fontSize: 'clamp(32px, 5.5vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: '-0.035em',
            color: '#0A0A0A',
            marginBottom: 20,
            maxWidth: 840,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          O conteúdo que já estruturou{' '}
          <span style={{ background: 'linear-gradient(90deg, #E01515, #1E52E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            +600 comerciais
          </span>{' '}
          — agora gratuito para você
        </h1>

        <p
          className="animate-fade-up"
          style={{ animationDelay: '140ms', fontSize: 'clamp(16px, 2vw, 20px)', color: '#525252', lineHeight: 1.6, maxWidth: 580, margin: '0 auto 36px' }}
        >
          Aprenda gratuitamente a construir um sistema comercial com previsibilidade, escala e liberdade — direto de quem fez R$30M no 2º ano de operação.
        </p>

        <div className="animate-fade-up" style={{ animationDelay: '200ms', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <button onClick={onOpenPopup} className="btn-primary" style={{ fontSize: 16, padding: '15px 36px' }}>
            Acessar Full Sales Flix <IconArrow />
          </button>
          <a href={YOUTUBE_PLAYLIST_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 15, padding: '14px 28px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconYouTube /> Ver playlist no YouTube
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   VIDEO
───────────────────────────────────────────── */
function VideoSection({ hasAccess, onOpenPopup }: { hasAccess: boolean; onOpenPopup: () => void }) {
  const [active, setActive] = useState(false)

  return (
    <section style={{ paddingBottom: 80, background: '#FFFFFF' }}>
      <div className="section-container" style={{ maxWidth: 860 }}>
        <FadeUp>
          <div style={{
            position: 'relative', borderRadius: 14, overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.09)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.11), 0 4px 16px rgba(0,0,0,0.06)',
            background: '#000', aspectRatio: '16/9',
          }}>
            {/* Thumbnail + overlay — shown when video is not yet active */}
            {!active && (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `url(https://img.youtube.com/vi/8GPRCLbxNRA/maxresdefault.jpg)`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  ...(hasAccess ? {} : { filter: 'blur(4px)', transform: 'scale(1.06)' }),
                }}
              />
            )}

            {/* Dark overlay */}
            {!active && (
              <div style={{ position: 'absolute', inset: 0, background: hasAccess ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.62)' }} />
            )}

            {/* Locked state — user hasn't registered yet */}
            {!hasAccess && !active && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, zIndex: 2 }}>
                {/* Lock icon */}
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="white" fillOpacity="0.9" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 'clamp(15px, 2.5vw, 18px)', marginBottom: 6, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    Preencha o cadastro para assistir
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 20 }}>
                    Acesso gratuito e imediato
                  </p>
                  <button
                    onClick={onOpenPopup}
                    className="btn-primary"
                    style={{ fontSize: 14, padding: '12px 28px' }}
                  >
                    Liberar Acesso Gratuito <IconArrow />
                  </button>
                </div>
              </div>
            )}

            {/* Unlocked play state */}
            {hasAccess && !active && (
              <div
                onClick={() => setActive(true)}
                style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
              >
                <div
                  style={{ width: 76, height: 76, borderRadius: '50%', background: '#E01515', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse-ring 2.4s ease infinite' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M8 5.5L21 13L8 20.5V5.5Z" fill="white" /></svg>
                </div>
                <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 4 }}>45 min</div>
                <div style={{ position: 'absolute', top: 14, left: 14, background: '#E01515', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Aula Gratuita</div>
              </div>
            )}

            {/* Active iframe */}
            {active && (
              <iframe
                src="https://www.youtube.com/embed/8GPRCLbxNRA?autoplay=1&rel=0&modestbranding=1"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FSS FLIX CTA
───────────────────────────────────────────── */
function FlixCTASection({ onOpenPopup }: { onOpenPopup: () => void }) {
  return (
    <section className="section-pad" style={{ background: '#F8F9FA', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="section-container" style={{ maxWidth: 800, textAlign: 'center' }}>
        <FadeUp>
          <SectionLabel text="Full Sales Flix" />
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A', lineHeight: 1.1, marginBottom: 18 }}>
            Acesse gratuitamente todo o conteúdo da{' '}
            <span style={{ color: '#E01515' }}>Full Sales System</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#525252', lineHeight: 1.65, maxWidth: 580, margin: '0 auto 36px' }}>
            O Full Sales Flix é a plataforma de conteúdo gratuito da FSS — aulas, frameworks e ferramentas práticas para estruturar seu comercial, disponíveis para você agora.
          </p>

          {/* Features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 40, textAlign: 'left', maxWidth: 640, margin: '0 auto 40px' }}>
            {[
              'Aulas de estruturação comercial',
              'Frameworks de pré-vendas e SDR',
              'Processos de fechamento e closer',
              'Arquitetura de produtos e LTV',
              'Cases reais com resultados',
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

// ▼ Substitua com os logos reais das empresas clientes ▼
const trustLogos = [
  'Empresa A', 'Empresa B', 'Empresa C', 'Empresa D',
  'Empresa E', 'Empresa F', 'Empresa G', 'Empresa H',
  'Empresa I', 'Empresa J', 'Empresa K', 'Empresa L',
]

function TrustSection() {
  return (
    <section className="section-pad" style={{ background: '#FFFFFF' }}>
      <div className="section-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 52 }}>
          <SectionLabel text="Quem Confia na FSS" />
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.12 }}>
            +600 empresas já aplicaram o sistema
          </h2>
          <p style={{ color: '#6B7280', fontSize: 16, marginTop: 12, maxWidth: 520, margin: '12px auto 0' }}>
            De escritórios de advocacia a empresas de tecnologia — em todos os segmentos
          </p>
        </FadeUp>

        {/* Logo grid — SUBSTITUA OS PLACEHOLDERS COM LOGOS REAIS */}
        <FadeUp delay={80}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 56,
          }}>
            {trustLogos.map((name, i) => (
              <div
                key={i}
                style={{
                  height: 68,
                  background: '#F8F9FA',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  color: '#9CA3AF',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Substitua o texto pelo componente <Image> com logo real */}
                {name}
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Stats strip */}
        <FadeUp delay={140}>
          <div style={{
            background: '#F8F9FA',
            border: '1px solid rgba(0,0,0,0.07)',
            borderRadius: 14,
            padding: '28px 32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            gap: 20,
          }}>
            {[
              { num: '+600', label: 'Empresas Estruturadas' },
              { num: 'NPS 87', label: 'Satisfação dos Clientes' },
              { num: '9,44/10', label: 'Nota de Avaliação' },
              { num: 'R$5,6M', label: 'Pico em um único mês' },
            ].map((s) => (
              <div key={s.num} style={{ textAlign: 'center', minWidth: 110 }}>
                <div style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.025em' }}>{s.num}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   QUEM É A FSS
───────────────────────────────────────────── */
function AboutSection() {
  return (
    <section className="section-pad" style={{ background: '#F8F9FA', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="section-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 56, alignItems: 'center' }}>
          {/* Photo placeholder */}
          <FadeUp>
            <div style={{
              width: '100%', maxWidth: 420, aspectRatio: '4/5',
              background: '#EFEFEF', border: '1px solid rgba(0,0,0,0.07)',
              borderRadius: 16, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, rgba(224,21,21,0.05) 0%, transparent 100%)', pointerEvents: 'none' }} />
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #E01515, #1E52E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>VS</div>
              <p style={{ color: '#9CA3AF', fontSize: 13 }}>Foto — Vinícius de Sá</p>
              <div style={{ position: 'absolute', bottom: 24, right: 24, background: '#fff', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>R$30M</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>no 2º ano</div>
              </div>
            </div>
          </FadeUp>

          {/* Bio */}
          <FadeUp delay={120}>
            <SectionLabel text="Quem é a FSS" />
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.14, marginBottom: 16 }}>
              A Full Sales System é uma empresa de{' '}
              <span style={{ color: '#E01515' }}>estruturação comercial</span>, não de cursos
            </h2>
            <p style={{ fontSize: 15, color: '#525252', lineHeight: 1.7, marginBottom: 24 }}>
              Fundada por Vinícius de Sá, a Full Sales System ajuda empresas que já faturam a criar sistemas comerciais com previsibilidade. Com +12 anos de experiência e mais de 600 negócios estruturados no Brasil e exterior, a empresa fez R$10M no 1º ano e R$30M no 2º.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                '+12 anos estruturando comerciais em segmentos como advocacia, contabilidade, tech e saúde',
                'Empresa própria fez R$10M no 1º ano, R$30M no 2º — com pico de R$5,6M/mês',
                'NPS de 87 e nota de avaliação 9,44 — resultado, não só conteúdo',
                'Fundador tirou 55 dias de férias/ano enquanto a empresa batia recordes',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <IconCheck />
                  <p style={{ fontSize: 14, color: '#525252', lineHeight: 1.55 }}>{item}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: '+12 anos', desc: 'de experiência' },
                { label: '+600 empresas', desc: 'estruturadas' },
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
    logo: 'estadao.svg',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Valor Econômico',
    title: 'Full Sales System aponta o caminho para crescer em 2026 com estratégias mais inteligentes',
    quote: 'Empresas que adotam estruturas de vendas inteligentes e estratégias orgânicas robustas tendem a prosperar em cenários de incerteza, criando vantagem competitiva mesmo com menor investimento direto em mídia.',
    logo: 'valor.svg',
    logoBg: '#FFFFFF',
  },
  {
    outlet: 'Pequenas Empresas & Grandes Negócios',
    title: 'Yuri Barbosa, Vinícius de Sá e Matheus Garcia trilharam caminhos distintos, mas marcados pelo mesmo ponto de virada',
    quote: 'Os sócios desenvolveram uma metodologia própria, capaz de integrar processos comerciais eficientes, automação estratégica e construção de autoridade digital. O objetivo não era apenas aumentar vendas, mas criar um modelo de crescimento consistente.',
    logo: 'pen.svg',
    logoBg: '#D35400',
  },
]

const pressLogos = [
  { name: 'Valor Econômico', file: 'valor.svg', bg: '#FFFFFF' },
  { name: 'Pequenas Empresas & Grandes Negócios', file: 'pen.svg', bg: '#D35400' },
  { name: 'Band', file: 'band.svg', bg: '#1A1A1A' },
  { name: 'Estadão', file: 'estadao.svg', bg: '#FFFFFF' },
  { name: 'Terra', file: 'terra.svg', bg: '#FFFFFF' },
]

function PressSection() {
  return (
    <section className="section-pad" style={{ background: '#FFFFFF' }}>
      <div className="section-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel text="Sessão de Imprensa" />
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.025em', color: '#0A0A0A', lineHeight: 1.12 }}>
            Full Sales System na Mídia
          </h2>
          <p style={{ color: '#6B7280', fontSize: 16, marginTop: 12, maxWidth: 480, margin: '12px auto 0' }}>
            Como a imprensa fala sobre a metodologia da Full Sales System
          </p>
        </FadeUp>

        {/* Press logos strip */}
        <FadeUp delay={60}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
            {pressLogos.map((logo, i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  width: 180,
                  background: logo.bg,
                  border: '1px solid rgba(0,0,0,0.09)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: 12,
                }}
              >
                <Image
                  src={`/press/${logo.file}`}
                  alt={logo.name}
                  width={156}
                  height={48}
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                />
              </div>
            ))}
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
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: item.logoBg,
                  border: '1px solid rgba(0,0,0,0.09)',
                  borderRadius: 8,
                  padding: '6px 14px',
                  height: 44,
                  width: 'fit-content',
                }}>
                  <Image
                    src={`/press/${item.logo}`}
                    alt={item.outlet}
                    width={120}
                    height={32}
                    style={{ objectFit: 'contain', maxHeight: 32 }}
                  />
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
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
              <div style={{ width: 32, height: 32, background: '#1E52E8', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff' }}>FS</div>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Full Sales System</span>
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
                  { label: 'YouTube — Comercial Faixa Preta', href: YOUTUBE_PLAYLIST_URL },
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
          <p style={{ fontSize: 13, color: '#52525B' }}>© {new Date().getFullYear()} Full Sales System. Todos os direitos reservados.</p>
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
export default function Home() {
  const [showPopup, setShowPopup] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)

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
      {showPopup && <LeadPopup onClose={closePopup} onSuccess={handleSuccess} />}
      <Navbar onOpenPopup={openPopup} />
      <HeroSection onOpenPopup={openPopup} />
      <VideoSection hasAccess={hasAccess} onOpenPopup={openPopup} />
      <FlixCTASection onOpenPopup={openPopup} />
      <TrustSection />
      <AboutSection />
      <PressSection />
      <Footer onOpenPopup={openPopup} />
      <StickyMobileCTA onOpenPopup={openPopup} />
    </main>
  )
}
