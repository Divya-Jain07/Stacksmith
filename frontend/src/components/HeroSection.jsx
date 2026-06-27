import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const LIGHT = {
  text:        '#2C1F14',
  sub:         '#5C3D20',
  muted:       '#7A6050',
  accent:      '#A07040',
  accentLight: '#C4956A',
  pill:        'rgba(160,112,64,0.13)',
  pillBorder:  'rgba(160,112,64,0.35)',
}
const DARK = {
  text:        '#F0E6D6',
  sub:         '#C8B49A',
  muted:       '#9A8070',
  accent:      '#C4956A',
  accentLight: '#DDB080',
  pill:        'rgba(196,149,106,0.14)',
  pillBorder:  'rgba(196,149,106,0.36)',
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
}
const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } },
}

export default function HeroSection() {
  const { isDarkMode } = useTheme()
  const P = isDarkMode ? DARK : LIGHT

  return (
    <section
      id="hero"
      style={{
        minHeight: '100svh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#1f2b36' : '#F5EDE3',
        backgroundImage: isDarkMode
          ? `linear-gradient(180deg, rgba(31,43,54,0.36) 0%, rgba(31,43,54,0.48) 42%, rgba(31,43,54,0.88) 82%, #1f2b36 100%), url('/library_hero_dark.png')`
          : `linear-gradient(180deg, rgba(245,237,227,0.10) 0%, rgba(245,237,227,0.18) 58%, rgba(245,237,227,0.72) 100%), url('/library_hero.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        /* top: just below navbar; bottom: keeps full bottom half free for illustration */
        paddingTop:    'clamp(5rem, 9vh, 6.5rem)',
        paddingBottom: '52vh',
        paddingLeft:   'clamp(1.5rem, 6vw, 3rem)',
        paddingRight:  'clamp(1.5rem, 6vw, 3rem)',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '32vh',
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(31,43,54,0) 0%, #1f2b36 92%)'
            : 'linear-gradient(180deg, rgba(245,237,227,0) 0%, #F5EDE3 92%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ position: 'relative', zIndex: 2, maxWidth: '600px', width: '100%' }}
      >
        {/* ── Eyebrow ── */}
        <motion.div variants={fadeUp} style={{ marginBottom: '1rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: P.accent,
            background: P.pill,
            border: `1px solid ${P.pillBorder}`,
            borderRadius: '999px',
            padding: '0.28rem 0.85rem',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: P.accent, display: 'inline-block', animation: 'hero-pulse 2s infinite' }} />
            Library Management System
          </span>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1 variants={fadeUp} style={{
          fontFamily: '"Manrope", sans-serif',
          fontSize: 'clamp(2.2rem, 5.5vw, 3.6rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          color: P.text,
          marginBottom: '0.9rem',
        }}>
          Manage.{' '}
          <span style={{ color: P.accent }}>Organize.</span>
          {' '}Empower.
        </motion.h1>

        {/* ── Subheading ── */}
        <motion.p variants={fadeUp} style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: 'clamp(0.9rem, 1.6vw, 1rem)',
          lineHeight: 1.65,
          color: P.sub,
          maxWidth: '420px',
          margin: '0 auto 2rem',
        }}>
          Role-based platform for staff, admins &amp; members —
          issue books, track fines, and chat in real time.
        </motion.p>

        {/* ── CTAs — solid contrast so they pop on any bg ── */}
        <motion.div variants={fadeUp} style={{
          display: 'flex',
          gap: '1.25rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Primary: solid dark brown — always visible */}
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
            <Link to="/login" style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1px',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              textDecoration: 'none',
              minWidth: '160px',
              background: isDarkMode ? '#C4956A' : '#6B4226',
              boxShadow: isDarkMode
                ? '0 4px 20px rgba(196,149,106,0.40)'
                : '0 4px 20px rgba(60,30,10,0.35)',
            }}>
              <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.88rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🖥️ Staff Portal
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.70)' }}>
                Admin · Librarian
              </span>
            </Link>
          </motion.div>

          {/* Secondary: white/opaque — always visible */}
          <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
            <Link to="/login?tab=member" style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '1px',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              textDecoration: 'none',
              minWidth: '160px',
              background: isDarkMode ? 'rgba(30,20,10,0.80)' : 'rgba(255,255,255,0.92)',
              border: `1.5px solid ${P.pillBorder}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}>
              <span style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.88rem', fontWeight: 700, color: P.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                📚 Member Kiosk
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.58rem', letterSpacing: '0.05em', color: P.muted }}>
                Students · Faculty
              </span>
            </Link>
          </motion.div>
        </motion.div>
        {/* ── Scroll hint — in normal flow, below buttons ── */}
        <motion.div
          variants={fadeUp}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '2rem', opacity: 0.7 }}
        >
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.52rem', letterSpacing: '0.1em', color: P.muted, textTransform: 'uppercase' }}>scroll</span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{ width: 1, height: 24, background: `linear-gradient(to bottom, ${P.accent}80, transparent)`, borderRadius: '1px' }}
          />
        </motion.div>
      </motion.div>

      <style>{`@keyframes hero-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </section>
  )
}
