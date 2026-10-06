import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, RefreshCw, ChevronLeft, ChevronRight, X, AlertCircle, Check, Filter } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useDialog } from '../../../context/DialogContext'
import { ROLES } from '../../../constants/roles'
import { fineApi } from '../../../services/api'

// Shared currency symbol — change here to affect all fine displays
const CURRENCY = '₹'

// Map stored DB values to display labels
const STATUS_LABEL = { pending: 'Pending', collected: 'Collected', left: 'Waived' }
const STATUS_COLOR = {
  pending:   { bg: 'rgba(239,83,80,0.12)',   color: '#EF9A9A' },
  collected: { bg: 'rgba(129,199,132,0.12)', color: '#81C784' },
  left:      { bg: 'rgba(189,189,189,0.12)', color: '#BDBDBD' }
}

const TABS = [
  { key: 'pending',   label: 'Pending'   },
  { key: 'collected', label: 'Collected' },
  { key: 'left',      label: 'Waived'    },
  { key: 'all',       label: 'All'       }
]

export default function FinesLedger() {
  const { role } = useAuth()
  const { notify, confirm } = useDialog()

  // Filter state
  const [activeTab,    setActiveTab]    = useState('pending')
  const [search,       setSearch]       = useState('')
  const [reason,       setReason]       = useState('')
  const [sort,         setSort]         = useState('newest')
  const [from,         setFrom]         = useState('')
  const [to,           setTo]           = useState('')
  const [page,         setPage]         = useState(1)
  const LIMIT = 20

  // Data state
  const [data,         setData]         = useState(null)   // { fines, total, totalPages, summary }
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  // Action state
  const [actionLoading, setActionLoading] = useState(null) // fineId being acted on
  const [waiverModal,   setWaiverModal]   = useState(null) // { fineId, amount }
  const [waiverReason,  setWaiverReason]  = useState('')

  // Debounce search
  const searchTimer = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [activeTab, reason, sort, from, to])

  const fetchFines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fineApi.getBranchFines({
        status: activeTab,
        reason,
        search: debouncedSearch,
        from,
        to,
        sort,
        page,
        limit: LIMIT
      })
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load fines')
    } finally {
      setLoading(false)
    }
  }, [activeTab, reason, debouncedSearch, from, to, sort, page])

  useEffect(() => { fetchFines() }, [fetchFines])

  const clearFilters = () => {
    setSearch('')
    setReason('')
    setFrom('')
    setTo('')
    setSort('newest')
    setPage(1)
  }
  const hasFilters = search || reason || from || to || sort !== 'newest'

  const handlePay = async (fine) => {
    const confirmed = await confirm(
      `Collect ${CURRENCY}${fine.amountToPay} cash from ${fine.borrowedUser?.name || 'member'}?`,
      'Mark as Paid'
    )
    if (!confirmed) return
    setActionLoading(fine._id)
    try {
      await fineApi.payFine(fine._id)
      notify('Fine marked as paid.', 'success')
      // Update row in-place
      setData(prev => ({
        ...prev,
        fines: prev.fines.map(f => f._id === fine._id ? { ...f, status: 'collected', statusLabel: 'Collected' } : f),
        summary: {
          ...prev.summary,
          pendingCount: Math.max(0, prev.summary.pendingCount - 1),
          pendingTotal: Math.max(0, prev.summary.pendingTotal - fine.amountToPay)
        }
      }))
    } catch (err) {
      notify(err.message || 'Payment failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const openWaiveModal = (fine) => {
    setWaiverModal({ fineId: fine._id, amount: fine.amountToPay, memberName: fine.borrowedUser?.name })
    setWaiverReason('')
  }

  const handleWaive = async () => {
    if (!waiverReason.trim() || waiverReason.trim().length < 3) {
      notify('Please enter a reason for waiving (at least 3 characters)', 'warning')
      return
    }
    setActionLoading(waiverModal.fineId)
    try {
      await fineApi.waiveFine(waiverModal.fineId, waiverReason.trim())
      notify('Fine waived.', 'success')
      setData(prev => ({
        ...prev,
        fines: prev.fines.map(f => f._id === waiverModal.fineId ? { ...f, status: 'left', statusLabel: 'Waived', waiverReason: waiverReason.trim() } : f),
        summary: {
          ...prev.summary,
          pendingCount: Math.max(0, prev.summary.pendingCount - 1),
          pendingTotal: Math.max(0, prev.summary.pendingTotal - waiverModal.amount)
        }
      }))
      setWaiverModal(null)
    } catch (err) {
      notify(err.message || 'Waive failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const canWaive = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN

  const summary = data?.summary

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Averia Sans Libre", system-ui' }}>
          Fines & Ledger
        </h2>
        <button onClick={fetchFines} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.85rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Pending Fines',        value: summary.pendingCount,        sub: null },
            { label: 'Pending Amount',        value: `${CURRENCY}${summary.pendingTotal?.toFixed(2)}`,   sub: null },
            { label: 'Collected This Month',  value: `${CURRENCY}${summary.collectedThisMonth?.toFixed(2)}`, sub: null }
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
              <div style={{ color: 'var(--accent-gold)', fontSize: '1.4rem', fontWeight: 700 }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? 'var(--accent-gold)' : 'var(--bg-hover)',
            color: activeTab === tab.key ? '#1a1a1a' : 'var(--text-muted)',
            border: 'none', borderRadius: '6px', padding: '0.4rem 1rem',
            fontWeight: activeTab === tab.key ? 700 : 500, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'all 0.15s'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by member name or code..."
              style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <select value={reason} onChange={e => setReason(e.target.value)} style={selectStyle}>
            <option value="">All Reasons</option>
            <option value="overdue">Overdue</option>
            <option value="lost">Lost</option>
            <option value="damaged">Damaged</option>
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
          </select>

          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...selectStyle, minWidth: '130px' }} title="From date" />
          <input type="date" value={to}   onChange={e => setTo(e.target.value)}   style={{ ...selectStyle, minWidth: '130px' }} title="To date" />

          {hasFilters && (
            <button onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,83,80,0.1)', color: '#EF9A9A', border: '1px solid rgba(239,83,80,0.2)', borderRadius: '8px', padding: '0.55rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', color: '#EF9A9A', background: 'rgba(239,83,80,0.08)', borderBottom: '1px solid rgba(239,83,80,0.2)' }}>
            <AlertCircle size={16} /> {error}
            <button onClick={fetchFines} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #EF9A9A', color: '#EF9A9A', borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading fines...</div>
        ) : !data || data.fines.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Check size={36} style={{ color: '#81C784', marginBottom: '0.75rem', opacity: 0.7 }} />
            <div>{activeTab === 'pending' ? 'No pending fines. Everything is collected.' : `No ${STATUS_LABEL[activeTab] || activeTab} fines found.`}</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={th}>Member</th>
                    <th style={th}>Book</th>
                    <th style={th}>Reason</th>
                    <th style={th}>Days OD</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Status</th>
                    <th style={th}>Created</th>
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fines.map((fine, idx) => (
                    <tr key={fine._id} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                      <td style={td}>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.9rem' }}>{fine.borrowedUser?.name || '—'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: '"JetBrains Mono", monospace' }}>{fine.borrowedUser?.memberCode || ''}</div>
                      </td>
                      <td style={{ ...td, maxWidth: '180px' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fine.bookTitle}</div>
                        {fine.borrowingId?.dueDate && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Due: {new Date(fine.borrowingId.dueDate).toLocaleDateString('en-GB')}</div>}
                      </td>
                      <td style={td}>
                        <span style={{ background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem', textTransform: 'capitalize' }}>{fine.reason}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ color: fine.daysOverdue > 0 ? '#EF9A9A' : 'var(--text-muted)', fontWeight: fine.daysOverdue > 0 ? 700 : 400 }}>
                          {fine.daysOverdue || 0}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.95rem' }}>{CURRENCY}{fine.amountToPay}</span>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px', ...STATUS_COLOR[fine.status] }}>
                          {STATUS_LABEL[fine.status] || fine.status}
                        </span>
                        {fine.status === 'collected' && fine.collectedAt && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(fine.collectedAt).toLocaleDateString('en-GB')}
                          </div>
                        )}
                        {fine.status === 'left' && fine.waiverReason && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fine.waiverReason}>
                            "{fine.waiverReason}"
                          </div>
                        )}
                      </td>
                      <td style={{ ...td, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {new Date(fine.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {fine.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              disabled={actionLoading === fine._id}
                              onClick={() => handlePay(fine)}
                              style={{ background: 'rgba(129,199,132,0.15)', color: '#81C784', border: '1px solid rgba(129,199,132,0.3)', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                            >
                              {actionLoading === fine._id ? '...' : 'Mark Paid'}
                            </button>
                            {canWaive && (
                              <button
                                disabled={actionLoading === fine._id}
                                onClick={() => openWaiveModal(fine)}
                                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                              >
                                Waive
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '0.35rem 0.75rem', background: 'var(--accent-gold)', color: '#1a1a1a', borderRadius: '6px', fontWeight: 700 }}>{page}</span>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} style={pageBtn}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Waive reason modal */}
      <AnimatePresence>
        {waiverModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.15rem' }}>Waive Fine</h3>
                <button onClick={() => setWaiverModal(null)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Waiving <strong style={{ color: 'var(--accent-gold)' }}>{CURRENCY}{waiverModal.amount}</strong> fine for <strong style={{ color: 'var(--text-main)' }}>{waiverModal.memberName}</strong>. Please provide a reason.
              </p>
              <textarea
                value={waiverReason}
                onChange={e => setWaiverReason(e.target.value)}
                placeholder="Enter waiver reason (min 3 characters)..."
                rows={3}
                maxLength={200}
                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => setWaiverModal(null)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleWaive} disabled={actionLoading === waiverModal.fineId}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: 'var(--accent-gold)', color: '#1a1a1a', cursor: 'pointer', fontWeight: 700 }}>
                  {actionLoading === waiverModal.fineId ? 'Waiving...' : 'Confirm Waive'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const th = { padding: '0.85rem 1rem' }
const td = { padding: '0.9rem 1rem', color: 'var(--text-main)', verticalAlign: 'top' }
const selectStyle = { padding: '0.6rem 0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }
const pageBtn = { background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }
