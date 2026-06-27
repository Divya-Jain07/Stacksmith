import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, DollarSign, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { memberApi } from '../../../services/api'

export default function MemberDashboardHome() {
  const { user } = useAuth()
  
  const [borrowings, setBorrowings] = useState([])
  const [fines, setFines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      setError(err.message || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const activeBorrows = borrowings.filter(b => b.requestStatus === 'Active')
  const pendingRequests = borrowings.filter(b => b.requestStatus === 'Requested')
  const overdueBorrows = activeBorrows.filter(b => new Date(b.dueDate) < new Date())
  const totalFines = fines.reduce((sum, f) => sum + (f.status === 'pending' ? f.amountToPay : 0), 0)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-gold)' }}>
          Member Kiosk
        </span>
        <h1 style={{
          fontFamily: '"Averia Sans Libre", system-ui', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800,
          color: 'var(--text-main)', letterSpacing: '-0.025em', margin: '0.3rem 0 0.5rem',
        }}>
          Good {greeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Welcome to your personal library dashboard. Track your books and fines here.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.35)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <MetricCard label="Active Borrows" value={loading ? '—' : activeBorrows.length} icon={<BookOpen size={20} color="#B8860B" />} color="#B8860B" />
        <MetricCard label="Pending Requests" value={loading ? '—' : pendingRequests.length} icon={<Clock size={20} color="#1565C0" />} color="#1565C0" />
        <MetricCard label="Overdue Books" value={loading ? '—' : overdueBorrows.length} icon={<AlertCircle size={20} color="#EF5350" />} color="#EF5350" />
        <MetricCard label="Unpaid Fines" value={loading ? '—' : `$${totalFines.toFixed(2)}`} icon={<DollarSign size={20} color="#4CAF50" />} color="#4CAF50" />
      </div>

      {/* Active Borrowings List */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem'
      }}>
        <h3 style={{ color: 'var(--text-main)', margin: '0 0 1rem', fontSize: '1.1rem', fontFamily: '"Averia Sans Libre", system-ui' }}>Current Borrowings</h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading books...</p>
        ) : activeBorrows.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You have no active borrowings.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeBorrows.map(b => {
              const isOverdue = new Date(b.dueDate) < new Date()
              return (
                <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)', padding: '1rem', borderRadius: '8px' }}>
                  <div>
                    <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>{b.bookCopyId?.bookId?.name || 'Unknown Book'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Barcode: <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{b.bookCopyId?.barcode || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due Date</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isOverdue ? '#EF5350' : '#4CAF50' }}>
                      {new Date(b.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
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
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: '"Averia Sans Libre", system-ui' }}>
        {value}
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
