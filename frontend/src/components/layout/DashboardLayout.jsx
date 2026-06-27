import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, User, X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import ThemeToggle from '../ThemeToggle'
import { authApi } from '../../services/api'

export default function DashboardLayout({ navItems, children }) {
  const { user, role, logout } = useAuth()
  const { isDarkMode } = useTheme()
  const location = useLocation()

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false)
  const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)

  const handlePwdChange = async (e) => {
    e.preventDefault()
    setPwdLoading(true)
    setPwdError('')
    setPwdSuccess('')
    try {
      await authApi.changePassword(pwdData.oldPassword, pwdData.newPassword)
      setPwdSuccess('Password changed successfully!')
      setTimeout(() => {
        setIsPwdModalOpen(false)
        setPwdData({ oldPassword: '', newPassword: '' })
        setPwdSuccess('')
      }, 1500)
    } catch (err) {
      setPwdError(err.message || 'Failed to change password')
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <div style={{
      height: '100svh',
      overflow: 'hidden',
      background: 'var(--bg-base)',
      display: 'flex',
      fontFamily: '"Inter", sans-serif',
      position: 'relative'
    }}>
      {/* ── Sidebar ── */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0,    opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: 240,
          height: '100svh',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={isDarkMode ? '/stackssmith-logo-dark.png' : '/stackssmith-logo.png'} alt="Stacksmith Logo" style={{ height: 42, objectFit: 'contain' }} />
          <span style={{ fontFamily: '"Averia Sans Libre", system-ui', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Stacksmith</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive = location.pathname === href || (href !== '/admin' && href !== '/librarian' && location.pathname.startsWith(href))
            return (
              <Link
                key={href}
                to={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.6rem 0.75rem', borderRadius: '8px', textDecoration: 'none',
                  color: isActive ? 'var(--accent-gold)' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent-gold-hover)' : 'transparent',
                  fontSize: '0.875rem', fontWeight: 500,
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--accent-gold-hover)'; e.currentTarget.style.color = 'var(--accent-gold)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
              >
                <Icon size={16} strokeWidth={1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div 
              onClick={() => setIsProfileModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="View Profile"
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-gold-hover)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>{user?.name}</div>
                <div style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'var(--accent-gold)',
                  background: 'var(--accent-gold-hover)', border: '1px solid var(--accent-gold-hover)',
                  borderRadius: '999px', padding: '0.18rem 0.55rem', display: 'inline-block',
                }}>
                  {role}
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '0.4rem 0',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF5350')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: 'clamp(1.5rem, 4vw, 2.5rem)', overflowY: 'auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0  }} transition={{ delay: 0.15, duration: 0.45 }}>
          {children}
        </motion.div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 48, height: 48, background: 'var(--accent-gold-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: '0 0 0.25rem 0' }}>{user?.name}</h3>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Role</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{role}</div>
              </div>

              <button 
                onClick={() => { setIsProfileModalOpen(false); setIsPwdModalOpen(true); }}
                style={{ width: '100%', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.85rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; e.currentTarget.style.color = 'var(--accent-gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              >
                Change Password
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPwdModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Change Password</h3>
                <button onClick={() => setIsPwdModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              {pwdError && <div style={{ color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{pwdError}</div>}
              {pwdSuccess && <div style={{ color: '#81C784', background: 'rgba(129,199,132,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{pwdSuccess}</div>}

              <form onSubmit={handlePwdChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Old Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showOldPwd ? "text" : "password"} value={pwdData.oldPassword} onChange={e => setPwdData(p => ({...p, oldPassword: e.target.value}))} required style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                      {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPwd ? "text" : "password"} value={pwdData.newPassword} onChange={e => setPwdData(p => ({...p, newPassword: e.target.value}))} required style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={pwdLoading} style={{ background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', cursor: pwdLoading ? 'not-allowed' : 'pointer', fontWeight: 600, marginTop: '0.5rem' }}>
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
