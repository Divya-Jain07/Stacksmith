import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Trash2, Plus, X, Search, ShieldAlert } from 'lucide-react'
import { adminApi, authApi } from '../../../services/api'

export default function LibrarianDirectory() {
  const [librarians, setLibrarians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', departmentName: '', staffId: '' })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchLibrarians = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getLibrarians()
      setLibrarians(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch librarians')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLibrarians() }, [])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    setModalError(null)
    try {
      await authApi.createLibrarian(formData)
      setIsAddModalOpen(false)
      setFormData({ name: '', email: '', phone: '', departmentName: '', staffId: '' })
      fetchLibrarians()
    } catch (err) {
      setModalError(err.message || 'Failed to create librarian')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleteLoading(true)
    try {
      await adminApi.deleteLibrarian(confirmDelete._id)
      setConfirmDelete(null)
      fetchLibrarians()
    } catch (err) {
      alert(err.message || 'Failed to delete librarian')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = librarians.filter(l =>
    (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.emailId || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.staffId || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
            Staff Management
          </span>
          <h2 style={{ color: 'var(--text-main)', fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', margin: '0.25rem 0 0.5rem', fontFamily: '"Manrope", sans-serif', fontWeight: 800 }}>
            Librarian Directory
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            {librarians.length} staff member{librarians.length !== 1 ? 's' : ''} in your branch
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'linear-gradient(135deg, #B8860B, #D4A017)',
            color: '#fff', border: 'none', padding: '0.6rem 1.1rem',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
          }}
        >
          <Plus size={16} /> Add Librarian
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.35)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Table Card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', maxWidth: '350px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or staff ID..."
              style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.25rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Email</th>
                <th style={{ padding: '1rem' }}>Staff ID</th>
                <th style={{ padding: '1rem' }}>Department</th>
                <th style={{ padding: '1rem' }}>Joined</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No librarians found.</td></tr>
              ) : (
                filtered.map((lib, idx) => (
                  <motion.tr
                    key={lib._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #B8860B, #D4A017)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                        }}>
                          {lib.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{lib.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{lib.emailId}</td>
                    <td style={{ padding: '1rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem', color: 'var(--accent-gold)' }}>{lib.staffId}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                        {lib.departmentName}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(lib.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => setConfirmDelete(lib)}
                        style={{ background: 'none', border: '1px solid rgba(239,83,80,0.4)', color: '#EF5350', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Remove Librarian"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Librarian Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0, fontFamily: '"Manrope", sans-serif' }}>Add New Librarian</h3>
                <button onClick={() => { setIsAddModalOpen(false); setModalError(null) }} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {modalError && (
                <div style={{ color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FieldInput label="Full Name" name="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))} required />
                <FieldInput label="Email" name="email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))} required />
                <FieldInput label="Phone" name="phone" value={formData.phone} onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))} required />
                <FieldInput label="Department (Optional)" name="departmentName" value={formData.departmentName} onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))} />
                <FieldInput label="Staff ID (Optional)" name="staffId" value={formData.staffId} onChange={e => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))} />

                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  A default password of <strong>password123</strong> will be assigned. The staff member can change it after logging in.
                </p>

                <button
                  type="submit" disabled={modalLoading}
                  style={{
                    background: modalLoading ? 'rgba(184,134,11,0.5)' : 'linear-gradient(135deg, #B8860B, #D4A017)',
                    color: '#fff', border: 'none', padding: '0.85rem', borderRadius: '8px',
                    cursor: modalLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.5rem'
                  }}
                >
                  {modalLoading ? 'Creating...' : 'Create Librarian'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239,83,80,0.3)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '420px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShieldAlert size={24} color="#EF5350" />
                <h3 style={{ color: '#EF9A9A', fontSize: '1.15rem', margin: 0 }}>Remove Librarian</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Are you sure you want to permanently remove <strong style={{ color: 'var(--text-main)' }}>{confirmDelete.name}</strong> ({confirmDelete.staffId})? This will delete their login access and staff profile.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: deleteLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: deleteLoading ? 0.6 : 1 }}
                >
                  {deleteLoading ? 'Removing...' : 'Yes, Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FieldInput({ label, ...props }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label}</label>
      <input
        {...props}
        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )
}
