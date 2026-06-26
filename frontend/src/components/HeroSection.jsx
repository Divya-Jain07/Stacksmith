import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.3 } },
}
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] } },
}
const scaleIn = {
  hidden:  { opacity: 0, scale: 0.82 },
  visible: { opacity: 1, scale: 1,  transition: { duration: 0.7,  ease: [0.34, 1.56, 0.64, 1] } },
}

export default function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(47,62,77,0.55) 0%, transparent 70%),' +
          'radial-gradient(ellipse 60% 40% at 80% 110%, rgba(184,134,11,0.12) 0%, transparent 60%),' +
          'linear-gradient(160deg, var(--bg-base) 0%, var(--bg-hover) 40%, var(--bg-base) 100%)',
        padding: 'clamp(7rem, 12vh, 10rem) clamp(1rem, 5vw, 2.5rem) clamp(4rem, 8vh, 6rem)',
        textAlign: 'center',
      }}
    >
      {/* ── Ambient glow orbs ── */}
      <div style={orb('var(--accent-gold)', '45%', '-12%', '520px', 0.07)} />
      <div style={orb('var(--color-secondary)', '-8%', '55%', '400px', 0.18)} />
      <div style={orb('var(--accent-gold)', '80%', '75%', '350px', 0.09)} />

      {/* ── Subtle grid overlay ── */}
      <div style={gridOverlay} />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        style={{ position: 'relative', zIndex: 2, maxWidth: '820px', width: '100%' }}
      >
        {/* ── Logo ── */}
        <motion.div variants={scaleIn} style={{ marginBottom: '2.5rem' }}>
          <img
            src="/stackssmith-logo.png"
            alt="Stacksmith"
            style={{
              height: 'clamp(90px, 14vw, 140px)',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 32px rgba(184,134,11,0.30))',
              margin: '0 auto',
            }}
          />
        </motion.div>

        {/* ── Eyebrow label ── */}
        <motion.div variants={fadeUp}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--accent-gold)',
              background: 'rgba(184,134,11,0.10)',
              border: '1px solid rgba(184,134,11,0.28)',
              borderRadius: '999px',
              padding: '0.35rem 1rem',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Library Management System
          </span>
        </motion.div>

        {/* ── Headline ── */}
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            marginBottom: '1.5rem',
          }}
        >
          Manage.{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--color-tertiary-light) 60%, var(--color-tertiary-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Organize.
          </span>{' '}
          Empower Libraries.
        </motion.h1>

        {/* ── Sub-headline ── */}
        <motion.p
          variants={fadeUp}
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
            fontWeight: 400,
            lineHeight: 1.7,
            color: 'var(--text-muted)',
            maxWidth: '580px',
            margin: '0 auto 2.75rem',
          }}
        >
          A full-stack, role-based library platform for staff, admins, and members.
          Issue books, track fines, and chat with patrons — all in one place.
        </motion.p>

        {/* ── CTA Buttons ── */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <CTAButton
            primary
            to="/login"
            icon="🖥️"
            label="Staff Portal Console"
            sub="Admin · Librarian"
          />
          <CTAButton
            to="/login?tab=member"
            icon="📚"
            label="Member Access Kiosk"
            sub="Students · Faculty"
          />
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          variants={fadeUp}
          style={{
            display: 'flex',
            gap: 'clamp(1.5rem, 4vw, 3rem)',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '3.5rem',
            paddingTop: '2.5rem',
            borderTop: '1px solid var(--bg-hover)',
          }}
        >
          {[
            ['4',    'User Roles',       'SuperAdmin to Member'],
            ['∞',    'Books Cataloged',  'Unlimited inventory'],
            ['Live', 'Chat Support',     'Real-time help desk'],
          ].map(([val, title, sub]) => (
            <div key={title} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--accent-gold), var(--color-tertiary-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{val}</div>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{title}</div>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Scroll hint ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 2,
        }}
      >
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--border-color)', textTransform: 'uppercase' }}>
          scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, rgba(184,134,11,0.6), transparent)', borderRadius: '1px' }}
        />
      </motion.div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </section>
  )
}

/* ── CTA Button ── */
function CTAButton({ primary, to, icon, label, sub }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ display: 'inline-block' }}
    >
      <Link
        to={to}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '2px',
          padding: '0.85rem 1.6rem',
          borderRadius: '10px',
          textDecoration: 'none',
          cursor: 'pointer',
          minWidth: '200px',
          background: primary
            ? 'linear-gradient(135deg, var(--accent-gold) 0%, var(--color-tertiary-light) 100%)'
            : 'var(--bg-hover)',
          border: primary
            ? 'none'
            : '1px solid var(--border-color)',
          boxShadow: primary
            ? '0 4px 24px rgba(184,134,11,0.40), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 2px 12px rgba(0,0,0,0.25)',
          backdropFilter: primary ? 'none' : 'blur(8px)',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        <span style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: primary ? '#fff' : 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {icon} {label}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.65rem',
          fontWeight: 400,
          letterSpacing: '0.06em',
          color: primary ? 'rgba(255,255,255,0.70)' : 'var(--text-muted)',
        }}>
          {sub}
        </span>
      </Link>
    </motion.div>
  )
}

/* ── Helpers ── */
function orb(color, top, left, size, opacity) {
  return {
    position: 'absolute',
    top,
    left,
    width: size,
    height: size,
    borderRadius: '50%',
    background: color,
    opacity,
    filter: 'blur(90px)',
    pointerEvents: 'none',
  }
}

const gridOverlay = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(var(--bg-hover) 1px, transparent 1px),' +
    'linear-gradient(90deg, var(--bg-hover) 1px, transparent 1px)',
  backgroundSize: '60px 60px',
  pointerEvents: 'none',
}
