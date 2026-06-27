import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, User, CheckCircle, XCircle, X, Edit3 } from 'lucide-react'
import { memberApi } from '../../../services/api'

export default function MemberDirectory() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', emailId: '', phone: '', memberCode: '', membershipType: 'Student', borrowLimits: 5 })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // Profile view modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [viewMemberId, setViewMemberId] = useState(null)
  const [profileData, setProfileData] = useState(null)

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', emailId: '', phone: '', membershipType: 'Student', borrowLimits: 5, status: 'active', membershipExpiryDate: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const data = await memberApi.getMembers()
      setMembers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    try {
      await memberApi.createMember(addForm)
      setIsAddModalOpen(false)
      setAddForm({ name: '', emailId: '', phone: '', memberCode: '', membershipType: 'Student', borrowLimits: 5 })
      fetchMembers()
    } catch (err) {
      setAddError(err.message || 'Failed to register member')
    } finally {
      setAddLoading(false)
    }
  }

  const handleViewProfile = async (id) => {
    try {
      const data = await memberApi.getMemberById(id)
      setProfileData(data)
      setViewMemberId(id)
      setIsProfileModalOpen(true)
    } catch (err) {
      alert('Failed to load profile')
    }
  }

  const handleOpenEdit = (member) => {
    setEditForm({
      name: member.name || '',
      emailId: member.emailId || '',
      phone: member.phone || '',
      membershipType: member.membershipType || 'Student',
      borrowLimits: member.borrowLimits || 5,
      status: member.status || 'active',
      membershipExpiryDate: member.membershipExpiryDate ? member.membershipExpiryDate.slice(0, 10) : ''
    })
    setEditError(null)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)
    try {
      await memberApi.updateMember(viewMemberId, editForm)
      const updated = await memberApi.getMemberById(viewMemberId)
      setProfileData(updated)
      fetchMembers()
      setIsEditModalOpen(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update member')
    } finally {
      setEditLoading(false)
    }
  }

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.memberCode.toLowerCase().includes(search.toLowerCase())
  )

  const activeOrRequestCount = (profile) => {
    if (!profile) return { label: 'Active Borrows', value: 0 };
    const reqs = profile.borrowHistory?.filter(h => h.requestStatus === 'Requested').length || 0;
    const active = profile.borrowHistory?.filter(h => h.requestStatus === 'Active').length || 0;
    if (reqs > 0) return { label: reqs === 1 ? 'Pending Request' : 'Pending Requests', value: reqs };
    return { label: active === 1 ? 'Active Borrow' : 'Active Borrows', value: active };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Manrope", sans-serif' }}>Member Directory</h2>
        <button
          onClick={() => { setAddForm({ name: '', emailId: '', phone: '', memberCode: '', membershipType: 'Student', borrowLimits: 5 }); setAddError(null); setIsAddModalOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <Plus size={16} /> Register Member
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', maxWidth: '350px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              style={inputStyleWithSearch}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Member</th>
                <th style={{ padding: '1rem' }}>Contact</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Limits</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading members...</td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No members found.</td></tr>
              ) : (
                filteredMembers.map((member, idx) => (
                  <tr key={member._id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, background: 'var(--bg-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--text-muted)" /></div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{member.name}</div>
                        <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.memberCode}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{member.emailId}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{member.membershipType}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {member.status === 'active'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#81C784', fontSize: '0.75rem', fontWeight: 600 }}><CheckCircle size={12} /> Active</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#EF9A9A', fontSize: '0.75rem', fontWeight: 600 }}><XCircle size={12} /> {member.status ? member.status.charAt(0).toUpperCase() + member.status.slice(1) : 'Inactive'}</span>
                      }
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>{member.borrowLimits || 0} limits</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleViewProfile(member._id)}
                          style={{ background: 'rgba(21,101,192,0.15)', color: '#64B5F6', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => { setViewMemberId(member._id); handleOpenEdit(member) }}
                          style={{ background: 'rgba(184,134,11,0.12)', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.3)', padding: '0.4rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {/* ── Register Member Modal ── */}
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={modalStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Register Member</h3>
                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              {addError && <div style={errorStyle}>{addError}</div>}
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input placeholder="Name" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                <input placeholder="Email" type="email" value={addForm.emailId} onChange={e => setAddForm(p => ({ ...p, emailId: e.target.value }))} required style={inputStyle} />
                <input placeholder="Phone" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} required style={inputStyle} />
                <input placeholder="Member Code (auto-generated if blank)" value={addForm.memberCode} onChange={e => setAddForm(p => ({ ...p, memberCode: e.target.value }))} style={inputStyle} />
                <input placeholder="Borrow Limit" type="number" min="1" value={addForm.borrowLimits} onChange={e => setAddForm(p => ({ ...p, borrowLimits: parseInt(e.target.value, 10) }))} required style={inputStyle} />
                <select value={addForm.membershipType} onChange={e => setAddForm(p => ({ ...p, membershipType: e.target.value }))} style={inputStyle}>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Public">Public</option>
                </select>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>
                  A default password of <strong>password123</strong> will be assigned.
                </p>
                <button type="submit" disabled={addLoading} style={{ background: 'var(--accent-gold)', color: '#fff', padding: '0.85rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: addLoading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
                  {addLoading ? 'Registering...' : 'Register Member'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── Profile View Modal ── */}
        {isProfileModalOpen && profileData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlayStyle}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ ...modalStyle, maxWidth: '520px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 48, height: 48, background: 'rgba(184,134,11,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: '0 0 0.2rem 0' }}>{profileData.member.name}</h3>
                    <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profileData.member.memberCode}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handleOpenEdit(profileData.member)}
                    style={{ background: 'rgba(184,134,11,0.12)', color: 'var(--accent-gold)', border: '1px solid rgba(184,134,11,0.3)', padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Edit3 size={14} /> Edit Details
                  </button>
                  <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20} /></button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatBox label={activeOrRequestCount(profileData).label} value={activeOrRequestCount(profileData).value} />
                <StatBox label="Total Read" value={profileData.stats?.totalBooksRead || 0} />
                <StatBox label="Outstanding Fines" value={`$${profileData.outstandingFines?.reduce((s, f) => s + (f.amountToPay || 0), 0).toFixed(2) || '0.00'}`} valueColor="#EF5350" />
                <StatBox label="Favorite Genre" value={profileData.stats?.mostReadGenre || 'N/A'} small />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1rem', marginTop: 0 }}>Contact Information</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <InfoRow label="Email" value={profileData.member.emailId} />
                  <InfoRow label="Phone" value={profileData.member.userId?.phone || 'N/A'} />
                  <InfoRow label="Membership" value={`${profileData.member.membershipType} (${profileData.member.borrowLimits || 0} limits)`} />
                  <InfoRow label="Status" value={profileData.member.status || 'N/A'} />
                  <InfoRow label="Expires" value={profileData.member.membershipExpiryDate ? new Date(profileData.member.membershipExpiryDate).toLocaleDateString() : 'N/A'} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Edit Member Modal ── */}
        {isEditModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ...overlayStyle, zIndex: 110 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ ...modalStyle, maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Edit Member Details</h3>
                <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              {editError && <div style={errorStyle}>{editError}</div>}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <FieldGroup label="Full Name">
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Email">
                  <input type="email" value={editForm.emailId} onChange={e => setEditForm(p => ({ ...p, emailId: e.target.value }))} required style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="Phone">
                  <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
                </FieldGroup>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FieldGroup label="Membership Type">
                    <select value={editForm.membershipType} onChange={e => setEditForm(p => ({ ...p, membershipType: e.target.value }))} style={inputStyle}>
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Public">Public</option>
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Borrow Limit">
                    <input type="number" min="1" max="20" value={editForm.borrowLimits} onChange={e => setEditForm(p => ({ ...p, borrowLimits: parseInt(e.target.value, 10) }))} required style={inputStyle} />
                  </FieldGroup>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FieldGroup label="Account Status">
                    <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Membership Expiry">
                    <input type="date" value={editForm.membershipExpiryDate} onChange={e => setEditForm(p => ({ ...p, membershipExpiryDate: e.target.value }))} style={inputStyle} />
                  </FieldGroup>
                </div>
                <button
                  type="submit" disabled={editLoading}
                  style={{ background: editLoading ? 'rgba(184,134,11,0.5)' : 'var(--accent-gold)', color: '#fff', padding: '0.85rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: editLoading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatBox({ label, value, valueColor, small }) {
  return (
    <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '12px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: small ? '1rem' : '1.5rem', fontWeight: 700, color: valueColor || 'var(--text-main)', marginTop: small ? '0.35rem' : 0 }}>{value}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}:</span>
      <span style={{ color: 'var(--text-main)' }}>{value}</span>
    </div>
  )
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }
const inputStyleWithSearch = { ...inputStyle, paddingLeft: '2.25rem' }
const overlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const modalStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }
const errorStyle = { color: '#EF9A9A', background: 'rgba(198,40,40,0.12)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }
