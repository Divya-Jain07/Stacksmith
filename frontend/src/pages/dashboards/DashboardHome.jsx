import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, DollarSign,
  MessageSquare, ChevronRight, AlertCircle, Plus, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLES }   from '../../constants/roles'
import { reportApi, authApi } from '../../services/api'

export default function DashboardHome() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', departmentName: '', staffId: '' })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await reportApi.getDashboard()
      setStats(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleModalChange = (e) => {
    setModalError(null)
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCreateLibrarian = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      await authApi.createLibrarian(formData)
      setIsModalOpen(false)
      setFormData({ name: '', email: '', phone: '', departmentName: '', staffId: '' })
    } catch (err) {
      setModalError(err.message || 'Failed to create librarian')
    } finally {
      setModalLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
            Operational Portal
          </span>
          <h1 style={{
            fontFamily: '"Manrope", sans-serif', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800,
            color: 'var(--text-main)', letterSpacing: '-0.025em', margin: '0.3rem 0 0.5rem',
          }}>
            Good {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Your library operations hub — counter, catalog, members and more.
          </p>
        </div>
        
        {role === ROLES.ADMIN && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
              color: '#fff', border: 'none', padding: '0.6rem 1rem',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}
          >
            <Plus size={16} /> Create Librarian
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.35)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Quick-action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Issue a Book',      color: '#B8860B',   icon: BookOpen,      href: role === ROLES.ADMIN ? '/admin/counter' : '/librarian/counter' },
          { label: 'Return a Book',     color: '#2F3E4D',   icon: ChevronRight,  href: role === ROLES.ADMIN ? '/admin/counter' : '/librarian/counter' },
          { label: 'Add Member',        color: '#1E7E34',   icon: Users,         href: role === ROLES.ADMIN ? '/admin/members' : '/librarian/members' },
          { label: 'Open Chat Queue',   color: '#1565C0',   icon: MessageSquare, href: role === ROLES.ADMIN ? '/admin/chat' : '/librarian/chat' },
        ].map(({ label, color, icon: Icon, href }) => (
          <motion.button
            key={label} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(href, { state: { defaultTab: label === 'Return a Book' ? 'return' : 'issue' } })}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.9rem 1.1rem',
              background: `var(--bg-hover)`, border: `1px solid var(--border-color)`, borderRadius: '10px',
              cursor: 'pointer', fontFamily: '"Inter", sans-serif', fontSize: '0.85rem', fontWeight: 600,
              color: 'var(--text-main)', transition: 'box-shadow 0.2s ease, transform 0.1s ease', textAlign: 'left',
            }}
          >
            <Icon size={18} color={color} strokeWidth={1.8} />
            {label}
          </motion.button>
        ))}
      </div>

      {/* KPI Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard label="Active Borrows" value={loading ? '—' : stats?.activeBorrows} icon={<BookOpen size={20} color="#B8860B" />} color="#B8860B" />
        <MetricCard label="Overdue Books" value={loading ? '—' : stats?.overdueBorrows} icon={<AlertCircle size={20} color="#EF5350" />} color="#EF5350" />
        <MetricCard label="Fines Collected" value={loading ? '—' : `$${(stats?.fines?.collected || 0).toFixed(2)}`} icon={<DollarSign size={20} color="#4CAF50" />} color="#4CAF50" />
        <MetricCard label="Books Need Repair" value={loading ? '—' : stats?.poorConditionBooks} icon={<LayoutDashboard size={20} color="#FF9800" />} color="#FF9800" />
      </div>

      {/* Top Members */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '1.5rem'
      }}>
        <h3 style={{ color: 'var(--text-main)', margin: '0 0 1rem', fontSize: '1.1rem', fontFamily: '"Manrope", sans-serif' }}>Most Active Members</h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading leaderboard...</p>
        ) : stats?.topMembers?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No borrowing history yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats?.topMembers?.map((m, i) => (
              <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'var(--accent-gold)' : 'var(--bg-hover)', color: i === 0 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>{m.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: '"JetBrains Mono", monospace' }}>{m.code}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 600 }}>{m.borrows} borrows</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Librarian Modal (Admin Only) */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Create Librarian</h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              {modalError && <div style={{ color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{modalError}</div>}

              <form onSubmit={handleCreateLibrarian} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input label="Name" name="name" value={formData.name} onChange={handleModalChange} required />
                <Input label="Email" name="email" type="email" value={formData.email} onChange={handleModalChange} required />
                <Input label="Phone" name="phone" value={formData.phone} onChange={handleModalChange} required />
                <Input label="Department (Optional)" name="departmentName" value={formData.departmentName} onChange={handleModalChange} />
                <Input label="Staff ID (Optional)" name="staffId" value={formData.staffId} onChange={handleModalChange} />
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
                  Note: A default password of <strong>password123</strong> will be assigned. The staff member can change it upon logging in.
                </p>

                <button
                  type="submit" disabled={modalLoading}
                  style={{
                    background: modalLoading ? 'rgba(21,101,192,0.5)' : 'linear-gradient(135deg, #1565C0, #0D47A1)',
                    color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.95rem', marginTop: '1rem'
                  }}
                >
                  {modalLoading ? 'Creating...' : 'Create Staff Member'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MetricCard({ label, value, icon, color }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: `1px solid var(--border-color)`, borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '8px', background: `var(--bg-hover)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: '"Manrope", sans-serif' }}>
        {value}
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label}</label>
      <input
        {...props}
        style={{
          width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
          background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
        }}
      />
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
