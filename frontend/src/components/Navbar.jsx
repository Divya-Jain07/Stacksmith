import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact',      href: '#contact'      },
]

export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [activeLink,   setActiveLink]   = useState('')

  /* ── scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── smooth-scroll helper ── */
  const handleNav = (e, href) => {
    e.preventDefault()
    setMobileOpen(false)
    setActiveLink(href)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        backgroundColor: scrolled
          ? 'var(--bg-surface)'
          : 'transparent',
        borderBottom: scrolled
          ? '1px solid var(--border-color)'
          : '1px solid transparent',
        transition: 'background-color 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* ── Logo ── */}
        <a
          href="#hero"
          onClick={e => handleNav(e, '#hero')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
        >
          <img
            src="/stackssmith-logo.png"
            alt="Stacksmith Logo"
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontFamily: '"Averia Sans Libre", system-ui', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Stacksmith</span>
        </a>

        {/* ── Desktop Nav ── */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
          className="nav-desktop"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <NavLink
              key={href}
              label={label}
              href={href}
              active={activeLink === href}
              onClick={handleNav}
            />
          ))}


          <ThemeToggle />
        </nav>

        {/* ── Mobile Hamburger ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="nav-mobile-btn" style={{ display: 'none' }}>
              <ThemeToggle />
            </div>
            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              className="nav-mobile-btn"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-main)',
                padding: '4px',
              }}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
      </div>

      {/* ── Mobile Dropdown ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                backdropFilter: 'blur(20px)',
                backgroundColor: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-color)',
                padding: '1rem clamp(1rem, 4vw, 2rem) 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={e => handleNav(e, href)}
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: activeLink === href ? 'var(--accent-gold)' : 'var(--text-main)',
                    padding: '0.7rem 0.5rem',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {label}
                </a>
              ))}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive styles via style tag */}
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </motion.header>
  )
}

/* ── Single nav link ── */
function NavLink({ label, href, active, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={href}
      onClick={e => onClick(e, href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: '0.9rem',
        fontWeight: 500,
        color: active || hovered ? 'var(--accent-gold)' : 'var(--text-muted)',
        textDecoration: 'none',
        position: 'relative',
        paddingBottom: '3px',
        transition: 'color 0.2s ease',
      }}
    >
      {label}
      {/* underline indicator */}
      <motion.span
        animate={{ scaleX: active || hovered ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, var(--accent-gold), var(--color-tertiary-light))',
          borderRadius: '1px',
          transformOrigin: 'left',
        }}
      />
    </a>
  )
}
