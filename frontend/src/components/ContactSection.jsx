import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Mail, GitFork, ExternalLink, BookOpen, ArrowRight } from 'lucide-react'

export default function ContactSection() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const [formState, setFormState] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = e =>
    setFormState(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = e => {
    e.preventDefault()
    // Replace with real API call when backend /api/contact is ready
    setSubmitted(true)
  }

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const item = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
  }

  return (
    <section
      id="contact"
      ref={ref}
      style={{
        background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-base) 100%)',
        padding: 'clamp(5rem, 10vh, 8rem) clamp(1rem, 5vw, 2.5rem) 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* glow */}
      <div style={{ position:'absolute', top:'5%', right:'-8%', width:'500px', height:'400px', borderRadius:'50%', background:'rgba(184,134,11,0.06)', filter:'blur(90px)', pointerEvents:'none' }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 5vh, 4rem)' }}
        >
          <span style={eyebrow}>Get in Touch</span>
          <h2 style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 'clamp(1.9rem, 4vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            margin: '1rem 0 1rem',
          }}>
            Ready to build your{' '}
            <span style={goldGrad}>smart library?</span>
          </h2>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            maxWidth: '460px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Reach out for a demo, integration help, or to report an issue.
          </p>
        </motion.div>

        {/* ── Contact Info ── */}
        <motion.div
          variants={item}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: 'clamp(2rem, 4vw, 3rem)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <img
            src="/stackssmith-logo.png"
            alt="Stacksmith"
            style={{ height: 60, marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 12px rgba(184,134,11,0.25))' }}
          />
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1.05rem',
            lineHeight: 1.75,
            color: 'var(--text-main)',
            maxWidth: '480px',
          }}>
            For further details and registration, please email us directly. We'd love to hear from you!
          </p>
          <a
            href="mailto:djain6756@gmail.com"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.8rem 1.6rem',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--color-tertiary-light) 100%)',
              border: 'none',
              color: '#fff',
              fontFamily: '"Inter", sans-serif',
              fontSize: '1rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(184,134,11,0.35)',
            }}
          >
            <Mail size={18} strokeWidth={2} />
            djain6756@gmail.com
          </a>
        </motion.div>
      </div>

      {/* ── Footer strip ── */}
      <div style={{
        marginTop: 'clamp(4rem, 8vh, 6rem)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '2rem clamp(1rem, 5vw, 2.5rem)',
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="var(--accent-gold)" strokeWidth={1.8} />
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.72rem',
              fontWeight: 500,
              color: 'var(--border-color)',
              letterSpacing: '0.06em',
            }}>
              Stacksmith © {new Date().getFullYear()}
            </span>
          </div>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: 'rgba(245,235,221,0.22)',
            letterSpacing: '0.06em',
          }}>
            Built with MERN · Manage. Organize. Empower Libraries.
          </span>
        </div>
      </div>
    </section>
  )
}

/* ── FormField helper ── */
function FormField({ label, id, name, type, placeholder, value, onChange, required }) {
  return (
    <div>
      <label style={labelStyle} htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={inputStyle}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-gold)')}
        onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
      />
    </div>
  )
}

/* ── Shared styles ── */
const eyebrow = {
  display: 'inline-block',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--accent-gold)',
  background: 'rgba(184,134,11,0.10)',
  border: '1px solid rgba(184,134,11,0.25)',
  borderRadius: '999px',
  padding: '0.3rem 0.85rem',
}

const goldGrad = {
  background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--color-tertiary-light) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const labelStyle = {
  display: 'block',
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: 'rgba(245,235,221,0.55)',
  marginBottom: '0.4rem',
  textTransform: 'uppercase',
}

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: '8px',
  border: '1.5px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text-main)',
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
}
