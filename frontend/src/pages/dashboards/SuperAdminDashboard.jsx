/**
 * pages/dashboards/SuperAdminDashboard.jsx
 *
 * SuperAdmin Global Analytics Portal.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, BookOpen, Activity, DollarSign, LogOut, Plus, X, Edit3, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'
import { adminApi, authApi } from '../../services/api'
import ThemeToggle from '../../components/ThemeToggle'
import { useTheme } from '../../context/ThemeContext'

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth()
  const { notify } = useDialog()
  const { isDarkMode } = useTheme()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', departmentName: '', staffId: '' })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editAdminId, setEditAdminId] = useState(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteAdminId, setDeleteAdminId] = useState(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getStats()
      setStats(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch global analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleModalChange = (e) => {
    setModalError(null)
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegisterBranch = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      await authApi.createAdmin(formData)
      setIsModalOpen(false)
      setFormData({ name: '', email: '', phone: '', password: '', departmentName: '', staffId: '' })
      await fetchStats() // Refresh data
    } catch (err) {
      setModalError(err.message || 'Registration failed')
    } finally {
      setModalLoading(false)
    }
  }

  const handleEditAdmin = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      await adminApi.updateAdmin(editAdminId, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        departmentName: formData.departmentName
      })
      setIsEditModalOpen(false)
      await fetchStats()
    } catch (err) {
      setModalError(err.message || 'Update failed')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteAdmin = async () => {
    setModalLoading(true)
    try {
      await adminApi.deleteAdmin(deleteAdminId)
      setIsDeleteModalOpen(false)
      await fetchStats()
    } catch (err) {
      notify(err.message || 'Delete failed', 'error')
    } finally {
      setModalLoading(false)
    }
  }

  // Aggregate KPI values
  const totalLibraries = stats?.totalLibraries || 0
  let totalBooks = 0
  let totalActiveBorrows = 0
  let globalRevenue = 0

  if (stats?.libraries) {
    stats.libraries.forEach(lib => {
      totalBooks += lib.metrics?.books || 0
      totalActiveBorrows += lib.metrics?.activeBorrows || 0
      globalRevenue += lib.metrics?.revenueCollected || 0
    })
  }

  const KPI_CARDS = [
    { icon: Building2,  label: 'Libraries Registered', value: loading ? '—' : totalLibraries, color: '#B8860B' },
    { icon: BookOpen,   label: 'Total Books (Agg.)',   value: loading ? '—' : totalBooks, color: '#2F3E4D' },
    { icon: Activity,   label: 'Active Borrowings',    value: loading ? '—' : totalActiveBorrows, color: '#1565C0' },
    { icon: DollarSign, label: 'Global Revenue',       value: loading ? '—' : `$${globalRevenue.toFixed(2)}`, color: '#2E7D32' },
  ]

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg-base)',
      padding: 'clamp(1.5rem, 4vw, 2.5rem)',
      fontFamily: '"Inter", sans-serif',
      position: 'relative'
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          maxWidth: '1100px',
          margin: '0 auto 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <img src={isDarkMode ? '/stackssmith-logo-dark.png' : '/stackssmith-logo.png'} alt="Stacksmith" style={{ height: 36, marginBottom: '0.75rem' }} />
          <span style={{
            display: 'block',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B8860B',
          }}>
            SuperAdmin — Global Control
          </span>
          <h1 style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.025em',
            margin: '0.2rem 0 0',
          }}>
            Platform Analytics
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.name}</span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.65rem',
            color: '#B8860B',
            background: 'rgba(184,134,11,0.12)',
            border: '1px solid rgba(184,134,11,0.28)',
            borderRadius: '999px',
            padding: '0.2rem 0.6rem',
          }}>
            SuperAdmin
          </span>
          <button
            onClick={logout}
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF5350')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={17} />
          </button>
        </div>
      </motion.div>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {error && (
          <div style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.35)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* KPI row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
          }}
        >
          {KPI_CARDS.map(({ icon: Icon, label, value, color }) => (
            <div key={label} style={{
              background: 'var(--bg-surface)',
              border: `1px solid var(--border-color)`,
              borderRadius: '14px',
              padding: '1.25rem',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: '10px',
                background: `${color}20`,
                border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.85rem',
              }}>
                <Icon size={20} color={color} strokeWidth={1.8} />
              </div>
              <div style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                marginBottom: '0.25rem',
              }}>
                {value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: 'var(--text-main)', fontFamily: '"Manrope", sans-serif', fontSize: '1.4rem' }}>Registered Branches</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #B8860B, #D4A017)',
                color: '#fff', border: 'none', padding: '0.6rem 1rem',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
              }}
            >
              <Plus size={16} /> Register Branch
            </button>
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            borderRadius: '12px', overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={thStyle}>Admin Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Books</th>
                  <th style={thStyle}>Members</th>
                  <th style={thStyle}>Active Borrows</th>
                  <th style={thStyle}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : stats?.libraries?.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No branches registered yet.</td></tr>
                ) : (
                  stats?.libraries?.map(lib => (
                    <tr key={lib.adminId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tdStyle}>{lib.adminName}</td>
                      <td style={tdStyle}>{lib.adminEmail}</td>
                      <td style={tdStyle}>{lib.metrics.books}</td>
                      <td style={tdStyle}>{lib.metrics.members}</td>
                      <td style={tdStyle}>{lib.metrics.activeBorrows}</td>
                      <td style={tdStyle}>${(lib.metrics.revenueCollected || 0).toFixed(2)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button 
                          onClick={() => {
                            setEditAdminId(lib.adminId)
                            setFormData({ name: lib.adminName, email: lib.adminEmail, phone: '', password: '', departmentName: '', staffId: '' })
                            setIsEditModalOpen(true)
                          }}
                          style={{ background: 'none', border: 'none', color: '#1565C0', cursor: 'pointer', padding: '0.25rem' }} 
                          title="Edit Admin"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setDeleteAdminId(lib.adminId)
                            setIsDeleteModalOpen(true)
                          }}
                          style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer', padding: '0.25rem' }} 
                          title="Delete Admin"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Register Branch Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Register New Branch</h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              {modalError && <div style={{ color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{modalError}</div>}

              <form onSubmit={handleRegisterBranch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input label="Admin Name" name="name" value={formData.name} onChange={handleModalChange} required />
                <Input label="Email" name="email" type="email" value={formData.email} onChange={handleModalChange} required />
                <Input label="Phone" name="phone" value={formData.phone} onChange={handleModalChange} required />
                <Input label="Department (Optional)" name="departmentName" value={formData.departmentName} onChange={handleModalChange} />
                <Input label="Staff ID (Optional)" name="staffId" value={formData.staffId} onChange={handleModalChange} />

                <button
                  type="submit" disabled={modalLoading}
                  style={{
                    background: modalLoading ? 'rgba(184,134,11,0.5)' : 'linear-gradient(135deg, #B8860B, #D4A017)',
                    color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.95rem', marginTop: '1rem'
                  }}
                >
                  {modalLoading ? 'Registering...' : 'Create Branch Admin'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isEditModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Edit Admin</h3>
                <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              {modalError && <div style={{ color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>{modalError}</div>}

              <form onSubmit={handleEditAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input label="Admin Name" name="name" value={formData.name} onChange={handleModalChange} required />
                <Input label="Email" name="email" type="email" value={formData.email} onChange={handleModalChange} required />
                <Input label="Phone" name="phone" value={formData.phone} onChange={handleModalChange} />
                <Input label="Department" name="departmentName" value={formData.departmentName} onChange={handleModalChange} />

                <button
                  type="submit" disabled={modalLoading}
                  style={{
                    background: modalLoading ? 'rgba(184,134,11,0.5)' : 'linear-gradient(135deg, #1565C0, #1976D2)',
                    color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px', cursor: modalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.95rem', marginTop: '1rem'
                  }}
                >
                  {modalLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid #EF5350', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#EF5350' }}>
                <AlertTriangle size={32} />
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Delete Admin Branch</h3>
              </div>
              
              <div style={{ background: 'rgba(239, 83, 80, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 83, 80, 0.3)', marginBottom: '1.5rem' }}>
                <strong style={{ display: 'block', color: '#EF5350', marginBottom: '0.5rem', fontSize: '0.9rem' }}>CRITICAL WARNING</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Deleting an Admin is a destructive action. The Admin's ID acts as the Tenant ID for all books, members, and transactions under their branch. 
                  Deleting the admin will orphan these records and permanently revoke their access.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAdmin}
                  disabled={modalLoading}
                  style={{ background: '#EF5350', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: modalLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {modalLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const thStyle = { padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tdStyle = { padding: '1rem 1.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }

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
