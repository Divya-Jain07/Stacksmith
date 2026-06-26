import { useState, useEffect } from 'react'
import { memberApi, borrowApi } from '../../../services/api'
import { Book, DollarSign, XCircle } from 'lucide-react'

export default function MemberHistory() {
  const [borrowings, setBorrowings] = useState([])
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [activeTab, setActiveTab] = useState('books')
  const [cancelLoading, setCancelLoading] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [borrowData, finesData] = await Promise.all([
        memberApi.getMyBorrowings(),
        memberApi.getMyFines()
      ])
      setBorrowings(borrowData)
      setFines(finesData)
    } catch (err) {
      setError(err.message || 'Failed to fetch history data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this book request?')) return;
    try {
      setCancelLoading(id)
      await borrowApi.cancelMemberRequest(id)
      await fetchData()
    } catch (err) {
      alert(err.message || 'Failed to cancel request')
    } finally {
      setCancelLoading(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Averia Sans Libre", system-ui' }}>My History</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Review your past borrowings, requests, and paid fines.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('books')}
          style={{
            background: activeTab === 'books' ? 'var(--accent-gold)' : 'var(--bg-hover)',
            color: activeTab === 'books' ? '#fff' : 'var(--text-main)',
            border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <Book size={16} /> Borrowing History
        </button>
        <button
          onClick={() => setActiveTab('fines')}
          style={{
            background: activeTab === 'fines' ? 'var(--accent-gold)' : 'var(--bg-hover)',
            color: activeTab === 'fines' ? '#fff' : 'var(--text-main)',
            border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          <DollarSign size={16} /> Fines History
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.35)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading history...</div>
      ) : activeTab === 'books' ? (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          {borrowings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No borrowing history found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem' }}>Book Title</th>
                  <th style={{ padding: '1rem' }}>Barcode</th>
                  <th style={{ padding: '1rem' }}>Borrowed Date</th>
                  <th style={{ padding: '1rem' }}>Returned Date</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {borrowings.map((b, idx) => (
                  <tr key={b._id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{b.bookCopyId?.bookId?.name || 'Unknown Book'}</td>
                    <td style={{ padding: '1rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem' }}>{b.bookCopyId?.barcode || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>{b.borrowedDate ? new Date(b.borrowedDate).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '1rem' }}>{b.returnedDate ? new Date(b.returnedDate).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: b.requestStatus === 'Returned' ? 'rgba(76, 175, 80, 0.1)' : b.requestStatus === 'Requested' ? 'rgba(21, 101, 192, 0.1)' : 'rgba(184, 134, 11, 0.1)',
                        color: b.requestStatus === 'Returned' ? '#4CAF50' : b.requestStatus === 'Requested' ? '#1565C0' : '#B8860B'
                      }}>
                        {b.requestStatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {b.requestStatus === 'Requested' && (
                        <button 
                          onClick={() => handleCancelRequest(b._id)}
                          disabled={cancelLoading === b._id}
                          style={{
                            background: 'none', border: '1px solid #EF5350', color: '#EF5350', 
                            padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            opacity: cancelLoading === b._id ? 0.5 : 1
                          }}
                        >
                          <XCircle size={14} />
                          {cancelLoading === b._id ? 'Canceling...' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          {fines.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No fines history found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem' }}>Book Title</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Reason</th>
                  <th style={{ padding: '1rem' }}>Date Incurred</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f, idx) => (
                  <tr key={f._id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{f.borrowingId?.bookCopyId?.bookId?.name || 'Unknown Book'}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>${f.amountToPay.toFixed(2)}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{f.reason}</td>
                    <td style={{ padding: '1rem' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        background: f.status === 'collected' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(239, 83, 80, 0.1)',
                        color: f.status === 'collected' ? '#4CAF50' : '#EF5350'
                      }}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
