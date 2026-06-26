/**
 * pages/UnauthorizedPage.jsx
 * Shown when a logged-in user tries to access a route their role doesn't permit.
 */
import { Link } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_ROUTES } from '../constants/roles'

export default function UnauthorizedPage() {
  const { role, logout } = useAuth()
  const home = ROLE_ROUTES[role] ?? '/'

  return (
    <div style={{
      minHeight: '100svh',
      background: 'linear-gradient(160deg, #0D1117, #161C24)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.25rem',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: '"Inter", sans-serif',
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'rgba(198,40,40,0.15)',
        border: '1.5px solid rgba(198,40,40,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <ShieldOff size={32} color="#EF5350" strokeWidth={1.5} />
      </div>

      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.7rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#EF5350',
      }}>
        403 — Access Denied
      </span>

      <h1 style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
        fontWeight: 800,
        color: '#F5EBDD',
        letterSpacing: '-0.02em',
        margin: 0,
      }}>
        You don't have permission
      </h1>

      <p style={{
        fontSize: '0.95rem',
        color: 'rgba(245,235,221,0.50)',
        maxWidth: '380px',
        lineHeight: 1.65,
        margin: 0,
      }}>
        Your current role (<strong style={{ color: '#B8860B' }}>{role}</strong>) isn't
        authorised to view that page.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
        <Link
          to={home}
          style={{
            padding: '0.6rem 1.35rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #B8860B, #D4A017)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
          }}
        >
          Go to my dashboard
        </Link>
        <button
          onClick={logout}
          style={{
            padding: '0.6rem 1.35rem',
            borderRadius: '8px',
            background: 'rgba(245,235,221,0.07)',
            border: '1px solid rgba(245,235,221,0.15)',
            color: 'rgba(245,235,221,0.70)',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
