import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, DollarSign, ShieldAlert, Check } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useDialog } from '../../../context/DialogContext'
import { ROLES } from '../../../constants/roles'
import { fineApi, memberApi } from '../../../services/api'

export default function FinesLedger() {
  const { role } = useAuth()
  const { notify, confirm } = useDialog()
  const [memberCode, setMemberCode] = useState('')
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchedMember, setSearchedMember] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!memberCode) return
    setLoading(true)
    setFines([])
    setSearchedMember(null)
    try {
      // 1. Fetch all members and find by code
      const allMembers = await memberApi.getMembers()
      const member = allMembers.find(m => m.memberCode.toLowerCase() === memberCode.toLowerCase())
      
      if (!member) {
        notify('Member not found with code: ' + memberCode, 'warning')
        return
      }

      setSearchedMember(member)

      // 2. Fetch fines
      const memberFines = await fineApi.getMemberFines(member._id)
      setFines(memberFines)
    } catch (err) {
      console.error(err)
      notify(err.message || 'Error fetching fines', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (fineId, amount) => {
    try {
      setActionLoading(true)
      await fineApi.payFine(fineId, amount)
      // Refresh fines
      const updatedFines = await fineApi.getMemberFines(searchedMember._id)
      setFines(updatedFines)
    } catch (err) {
      notify(err.message || 'Payment failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleWaive = async (fineId) => {
    const confirmed = await confirm('Are you sure you want to waive this fine?', 'Waive Fine')
    if (!confirmed) return
    try {
      setActionLoading(true)
      await fineApi.waiveFine(fineId)
      const updatedFines = await fineApi.getMemberFines(searchedMember._id)
      setFines(updatedFines)
    } catch (err) {
      notify(err.message || 'Waive failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Manrope", sans-serif' }}>Fines & Ledger</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', height: 'fit-content' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1rem', margin: '0 0 1rem' }}>Lookup Member</h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              placeholder="Member Code (e.g. MEM-001)" 
              value={memberCode} onChange={e => setMemberCode(e.target.value)}
              style={inputStyle} 
            />
            <button type="submit" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Searching...' : 'Find Fines'}
            </button>
          </form>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {!searchedMember ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
              <DollarSign size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>Search for a member to view or collect fines.</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 1rem' }}>Fines for {searchedMember?.name} ({searchedMember?.memberCode})</h3>
              
              {fines.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                  <Check size={32} style={{ color: '#81C784', marginBottom: '1rem', opacity: 0.7 }} />
                  <p>No fines found! Member is all clear.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                  {fines.map(fine => (
                    <div key={fine._id} style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>${fine.amountToPay} - {fine.reason}</span>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                          background: fine.status === 'paid' ? 'rgba(129,199,132,0.15)' : fine.status === 'waived' ? 'var(--border-color)' : 'rgba(239,83,80,0.15)',
                          color: fine.status === 'paid' ? '#81C784' : fine.status === 'waived' ? 'var(--text-main)' : '#EF9A9A'
                        }}>
                          {fine.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Created: {new Date(fine.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                      </div>
                      
                      {fine.status === 'unpaid' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button disabled={actionLoading} onClick={() => handlePay(fine._id, fine.amountToPay)} style={{ flex: 1, background: 'rgba(129,199,132,0.15)', color: '#81C784', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            Collect Payment
                          </button>
                          {role === ROLES.SUPER_ADMIN && (
                            <button disabled={actionLoading} onClick={() => handleWaive(fine._id)} style={{ background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                              Waive
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }
