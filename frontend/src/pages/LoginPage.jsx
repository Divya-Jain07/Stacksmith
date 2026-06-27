/**
 * pages/LoginPage.jsx — Stacksmith Unified Login
 *
 * Two tabs:
 *   • Staff   — email + password  → POST /api/auth/staff-login
 *   • Member  — memberCode + password → POST /api/auth/member-login
 *
 * After successful login, AuthContext.applySession() handles the redirect.
 * If the user arrived from a protected route, they're sent back there instead.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle, BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_ROUTES } from '../constants/roles'

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuth, role, loginStaff, loginMember, loading, error, clearError } = useAuth()

  const [searchParams] = useSearchParams()

  // Pre-select tab from ?tab=member (set by landing page Member button)
  const initialTab = searchParams.get('tab') === 'member' ? 'member' : 'staff'

  const [tab, setTab] = useState(initialTab)
  const [showPwd, setShowPwd] = useState(false)
  const [formData, setFormData] = useState({ email: '', memberCode: '', password: '' })

  /* If already logged in, redirect immediately */
  useEffect(() => {
    if (isAuth && role) {
      const defaultDest = ROLE_ROUTES[role] ?? '/'
      const intendedDest = location.state?.from?.pathname

      // If there's an intended destination, ensure it matches the user's role's base route
      // so they don't get a 403. Otherwise, send them to their default dashboard.
      let destination = defaultDest
      if (intendedDest && defaultDest !== '/' && intendedDest.startsWith(defaultDest)) {
        destination = intendedDest
      }

      navigate(destination, { replace: true })
    }
  }, [isAuth, role, navigate, location.state])

  /* Clear error when switching tabs or typing */
  const handleChange = e => {
    clearError()
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const switchTab = t => {
    clearError()
    setTab(t)
    setFormData({ email: '', memberCode: '', password: '' })
    setShowPwd(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (tab === 'staff') {
      await loginStaff(formData.email.trim(), formData.password)
    } else {
      await loginMember(formData.memberCode.trim(), formData.password)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background:
        'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'clamp(1rem, 4vw, 2rem)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient orb */}
      <div style={{ position: 'absolute', top: '-8%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(184,134,11,0.07)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-5%', left: '5%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(47,62,77,0.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '20px',
          padding: 'clamp(1.75rem, 4vw, 2.5rem)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Logo + Brand ── */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1.75rem', justifyContent: 'center' }}>
          <img src="/stackssmith-logo.png" alt="Stacksmith Logo" style={{ height: 44, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(184,134,11,0.30))' }} />
          <span style={{ fontFamily: '"Averia Sans Libre", system-ui', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Stacksmith</span>
        </Link>

        {/* ── Heading ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: '1.6rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: 'var(--text-main)',
            marginBottom: '0.4rem',
          }}>
            Welcome back
          </h1>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.875rem',
            color: 'rgba(245,235,221,0.50)',
          }}>
            Sign in to your Stacksmith account
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '1.75rem',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {[
            { key: 'staff', label: '🖥️ Staff Portal' },
            { key: 'member', label: '📚 Member Kiosk' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                padding: '0.55rem 0.5rem',
                borderRadius: '7px',
                border: 'none',
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.22s ease',
                background: tab === key
                  ? 'linear-gradient(135deg, #B8860B, #D4A017)'
                  : 'transparent',
                color: tab === key ? '#fff' : 'rgba(245,235,221,0.45)',
                boxShadow: tab === key ? '0 2px 10px rgba(184,134,11,0.35)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Form ── */}
        <AnimatePresence mode="wait">
          <motion.form
            key={tab}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Staff → email field; Member → memberCode field */}
            {tab === 'staff' ? (
              <Field
                id="email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="admin@library.edu"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            ) : (
              <Field
                id="memberCode"
                name="memberCode"
                type="text"
                label="Member Code"
                placeholder="MEM-1234"
                value={formData.memberCode}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            )}

            {/* Password */}
            <div>
              <label style={labelStyle} htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  onFocus={e => (e.target.style.borderColor = '#B8860B')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ── Error banner ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    background: 'rgba(198,40,40,0.12)',
                    border: '1px solid rgba(198,40,40,0.35)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.8rem',
                    overflow: 'hidden',
                  }}
                >
                  <AlertCircle size={15} color="#EF5350" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '0.82rem',
                    color: '#EF9A9A',
                    lineHeight: 1.45,
                  }}>
                    {error}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ── */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.02, y: -1 }}
              whileTap={loading ? {} : { scale: 0.97 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.8rem',
                marginTop: '0.25rem',
                borderRadius: '10px',
                border: 'none',
                background: loading
                  ? 'rgba(184,134,11,0.40)'
                  : 'linear-gradient(135deg, #B8860B 0%, #D4A017 100%)',
                color: '#fff',
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(184,134,11,0.40)',
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <>
                  <Spinner />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* ── Footer hint ── */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
          }}>
            {tab === 'staff'
              ? 'For SuperAdmin · Admin · Librarian accounts'
              : 'Use your library-issued Member Code'}
          </span>
        </div>

        {/* Back to landing */}
        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <Link
            to="/"
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={e => (e.target.style.color = 'var(--accent-gold)')}
            onMouseLeave={e => (e.target.style.color = 'var(--text-muted)')}
          >
            ← Back to Stacksmith home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Field component ── */
function Field({ id, name, type, label, placeholder, value, onChange, autoComplete, required }) {
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
        autoComplete={autoComplete}
        required={required}
        style={inputStyle}
        onFocus={e => (e.target.style.borderColor = 'var(--accent-gold)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
      />
    </div>
  )
}

/* ── Spinner ── */
function Spinner() {
  return (
    <span style={{
      width: 15,
      height: 15,
      border: '2px solid rgba(184,134,11,0.2)',
      borderTopColor: 'var(--accent-gold)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

/* ── Shared styles ── */
const labelStyle = {
  display: 'block',
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: '0.4rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.7rem 0.9rem',
  borderRadius: '9px',
  border: '1.5px solid var(--border-color)',
  background: 'var(--bg-hover)',
  color: 'var(--text-main)',
  fontFamily: '"Inter", sans-serif',
  fontSize: '0.92rem',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  boxSizing: 'border-box',
}
