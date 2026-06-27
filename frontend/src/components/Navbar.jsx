import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useTheme } from '../context/ThemeContext'

/* Warm palette matching the hero illustration */
const C = {
  cream:    '#F5EDE3',
  tan:      '#D4B896',
  brown:    '#A07040',
  dark:     '#2C1F14',
  charcoal: '#4A3728',
  muted:    '#7A6050',
}

const NAV_LINKS = [
  { label: 'Features',     href: '#features'    },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact',      href: '#contact'      },
]

export default function Navbar() {
  const { isDarkMode } = useTheme()
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeLink, setActiveLink] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNav = (e, href) => {
    e.preventDefault()
    setMobileOpen(false)
    setActiveLink(href)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const glassBg = scrolled
    ? isDarkMode ? 'rgba(22,16,10,0.88)' : 'rgba(245,237,227,0.92)'
    : isDarkMode ? 'rgba(22,16,10,0.55)' : 'rgba(245,237,227,0.72)'
  const borderC = scrolled
    ? isDarkMode ? 'rgba(196,149,106,0.20)' : C.tan
    : 'transparent'
  const textC = isDarkMode ? '#F5EDE3' : C.dark
  const mobileBg = isDarkMode ? 'rgba(22,16,10,0.97)' : 'rgba(245,237,227,0.97)'
  const mobileBorder = isDarkMode ? 'rgba(196,149,106,0.20)' : `${C.tan}`

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        backgroundColor: glassBg,
        borderBottom: `1px solid ${borderC}`,
        boxShadow: scrolled ? `0 2px 24px rgba(0,0,0,0.14)` : 'none',
        transition: 'background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 clamp(1rem, 4vw, 2rem)',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* ── Logo ── */}
        <a
          href="#hero"
          onClick={e => handleNav(e, '#hero')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}
        >
          <img
            src={isDarkMode ? '/stackssmith-logo-dark.png' : '/stackssmith-logo.png'}
            alt="Stacksmith Logo"
            style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
          />
          <span style={{
            fontFamily: '"Averia Sans Libre", "Manrope", system-ui',
            fontSize: '1.2rem',
            fontWeight: 800,
            color: textC,
            letterSpacing: '-0.02em',
            transition: 'color 0.35s',
          }}>
            Stacksmith
          </span>
        </a>

        {/* ── Desktop Nav ── */}
        <nav
          className="nav-desktop"
          style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}
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

        {/* ── Mobile controls ── */}
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
              color: textC,
              padding: '4px',
              transition: 'color 0.35s',
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
            <div style={{
              backgroundColor: mobileBg,
              backdropFilter: 'blur(20px)',
              borderTop: `1px solid ${mobileBorder}`,
              padding: '1rem clamp(1rem, 4vw, 2rem) 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}>
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={e => handleNav(e, href)}
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1rem',
                    fontWeight: 500,
                    color: activeLink === href ? C.brown : textC,
                    padding: '0.7rem 0.5rem',
                    textDecoration: 'none',
                    borderBottom: `1px solid ${C.tan}55`,
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

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </motion.header>
  )
}

function NavLink({ label, href, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  const { isDarkMode } = useTheme()
  const inactiveColor = isDarkMode ? '#A89080' : C.muted
  return (
    <a
      href={href}
      onClick={e => onClick(e, href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: '0.88rem',
        fontWeight: 500,
        color: active || hovered ? C.brown : inactiveColor,
        textDecoration: 'none',
        position: 'relative',
        paddingBottom: '3px',
        transition: 'color 0.2s ease',
      }}
    >
      {label}
      <motion.span
        animate={{ scaleX: active || hovered ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${C.brown}, #C4956A)`,
          borderRadius: '1px',
          transformOrigin: 'left',
        }}
      />
    </a>
  )
}
