import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, CheckCircle, AlertCircle, RefreshCw, XCircle } from 'lucide-react'
import { borrowApi, bookApi } from '../../../services/api'

export default function CounterConsole() {
  const location = useLocation()
  const [tab, setTab] = useState(location.state?.defaultTab || 'issue') // issue, return, renew
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    memberCode: '', barcode: '', dueDate: ''
  })

  const [pendingRequests, setPendingRequests] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [pendingDueDates, setPendingDueDates] = useState({})

  // Autocomplete states
  const [books, setBooks] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedBookCopies, setSelectedBookCopies] = useState(null)

  // Return preview & result card states
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [returnResult, setReturnResult] = useState(null)

  // Trigger preview fetch when barcode changes on return tab
  useEffect(() => {
    if (tab !== 'return' || !formData.barcode.trim()) {
      setPreviewData(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const data = await borrowApi.previewReturn(formData.barcode.trim())
        setPreviewData(data)
      } catch (err) {
        setPreviewData(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [tab, formData.barcode])

  const fetchPending = async () => {
    try {
      setLoadingPending(true)
      const data = await borrowApi.getPendingRequests()
      setPendingRequests(data)
    } catch (err) {
      console.error('Failed to fetch pending requests', err)
    } finally {
      setLoadingPending(false)
    }
  }

  // Fetch pending requests and book catalog on mount
  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 15000)
    
    const fetchBooks = async () => {
      const cachedBooks = bookApi.getCachedBooks()
      if (cachedBooks) {
        setBooks(cachedBooks)
        return
      }

      try {
        const data = await bookApi.getBooks()
        setBooks(data)
      } catch (err) {
        console.error('Failed to fetch catalog', err)
      }
    }
    fetchBooks()
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (location.state?.defaultTab) {
      setTab(location.state.defaultTab)
    }
  }, [location.state])

  const handleApprove = async (id) => {
    try {
      let dueDateStr = pendingDueDates[id]
      if (!dueDateStr) {
        const defaultDueDate = new Date()
        defaultDueDate.setDate(defaultDueDate.getDate() + 14)
        dueDateStr = defaultDueDate.toISOString()
      } else {
        dueDateStr = new Date(dueDateStr).toISOString()
      }
      await borrowApi.confirmIssue(id, { dueDate: dueDateStr })
      setMessage('Request approved and book issued.')
      fetchPending()
    } catch (err) {
      setError(err.message || 'Failed to approve request')
    }
  }

  const handleReject = async (id) => {
    try {
      await borrowApi.cancelMemberRequest(id)
      setMessage('Request rejected.')
      fetchPending()
    } catch (err) {
      setError(err.message || 'Failed to reject request')
    }
  }

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
    setMessage(null)
    setError(null)
  }

  const handleReturnProcess = async (markPaidImmediately = false) => {
    setLoading(true)
    setMessage(null)
    setError(null)
    const trimmedBarcode = formData.barcode.trim();

    try {
      if (!trimmedBarcode) throw new Error('Barcode required for Return')
      const res = await borrowApi.returnBook({ barcode: trimmedBarcode })
      
      let isPaid = false;
      if (markPaidImmediately && res.fineId && res.fineAmount > 0) {
        try {
          const { fineApi } = await import('../../../services/api');
          await fineApi.payFine(res.fineId);
          isPaid = true;
        } catch (payErr) {
          setError(`Book returned successfully, but marking fine as paid failed: ${payErr.message}. The fine remains pending.`);
        }
      }

      setReturnResult({
        bookTitle: res.bookTitle || previewData?.bookTitle || 'Book',
        memberName: res.memberName || previewData?.memberName || 'Member',
        memberCode: res.memberCode || previewData?.memberCode || '',
        returnedDate: res.returnedDate || new Date().toISOString(),
        daysOverdue: res.daysOverdue !== undefined ? res.daysOverdue : (previewData?.daysOverdue || 0),
        fineAmount: res.fineAmount !== undefined ? res.fineAmount : (previewData?.fineAmount || 0),
        fineId: res.fineId,
        status: isPaid ? 'Paid' : (res.fineAmount > 0 ? 'Pending' : 'Returned on time')
      });

      if (!isPaid && res.fineAmount > 0) {
        setMessage(`Book returned. Overdue by ${res.daysOverdue} days. Fine: ₹${res.fineAmount} is pending.`);
      } else if (isPaid) {
        setMessage(`Book returned and fine of ₹${res.fineAmount} marked as paid in cash.`);
      } else {
        setMessage('Book returned on time. No fine.');
      }

      setFormData({ memberCode: '', barcode: '', dueDate: '' });
      setPreviewData(null);
    } catch (err) {
      setError(err.message || 'Return failed');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (tab === 'return') {
      return handleReturnProcess(false);
    }

    setLoading(true)
    setMessage(null)
    setError(null)
    setShowDropdown(false)

    try {
      const trimmedMemberCode = formData.memberCode.trim();
      const trimmedBarcode = formData.barcode.trim();

      if (tab === 'issue') {
        if (!trimmedMemberCode || !trimmedBarcode || !formData.dueDate) throw new Error('All fields required for Issue')
        const res = await borrowApi.issueBook({ 
          memberCode: trimmedMemberCode, 
          barcode: trimmedBarcode, 
          dueDate: formData.dueDate 
        })
        setMessage(`Book issued successfully to ${trimmedMemberCode}`)
      } else if (tab === 'renew') {
        if (!trimmedBarcode || !formData.dueDate) throw new Error('Barcode and new Due Date required for Renew')
        const res = await borrowApi.renewBorrowing({ 
          barcode: trimmedBarcode, 
          newDueDate: formData.dueDate 
        })
        setMessage(`Book renewed successfully until ${formData.dueDate}`)
      }
      setFormData({ memberCode: '', barcode: '', dueDate: '' })
    } catch (err) {
      setError(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const isWarning = message && typeof message === 'string' && message.includes('Fine: ₹') && !message.endsWith('Fine: ₹0');

  return (
    <div>
      <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: '0 0 1.5rem', fontFamily: '"Manrope", sans-serif' }}>Counter Console</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '2rem' }}>
        {/* Left Column - Direct Walk-in panel */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            {['issue', 'return', 'renew'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setShowDropdown(false); setSelectedBookCopies(null); }}
                style={{
                  flex: 1, padding: '1rem', background: tab === t ? 'var(--accent-gold-hover)' : 'transparent',
                  border: 'none', color: tab === t ? 'var(--accent-gold)' : 'var(--text-muted)',
                  cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', transition: '0.2s',
                  borderBottom: tab === t ? '2px solid var(--accent-gold)' : '2px solid transparent'
                }}
              >
                {t} Book
              </button>
            ))}
          </div>
          
          <div style={{ padding: '2rem' }}>
            {message && <div style={{ background: isWarning ? 'rgba(255,152,0,0.1)' : 'rgba(76,175,80,0.1)', color: isWarning ? '#FFB74D' : '#81C784', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{isWarning ? <AlertCircle size={18}/> : <CheckCircle size={18}/>} {message}</div>}
            {error && <div style={{ background: 'rgba(239,83,80,0.1)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18}/> {error}</div>}

            {/* Persistent Return Result Card */}
            {returnResult && (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>Return Processed</h4>
                  <span style={{
                    padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                    background: returnResult.status === 'Paid' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(239, 83, 80, 0.15)',
                    color: returnResult.status === 'Paid' ? '#4CAF50' : '#EF5350'
                  }}>
                    {returnResult.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div><strong>Book:</strong> {returnResult.bookTitle || 'Book'}</div>
                  <div><strong>Member:</strong> {returnResult.memberName} ({returnResult.memberCode})</div>
                  <div><strong>Returned:</strong> {new Date(returnResult.returnedDate).toLocaleDateString('en-GB')}</div>
                  <div><strong>Days Overdue:</strong> {returnResult.daysOverdue || 0}</div>
                  <div><strong>Fine Amount:</strong> ₹{(returnResult.fineAmount || 0).toFixed(2)}</div>
                </div>
                {returnResult.status === 'Pending' && returnResult.fineId && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const { fineApi } = await import('../../../services/api');
                        await fineApi.payFine(returnResult.fineId);
                        setReturnResult(prev => ({ ...prev, status: 'Paid' }));
                        setMessage('Fine marked as paid in cash successfully.');
                      } catch (err) {
                        setError(err.message || 'Failed to mark fine as paid.');
                      }
                    }}
                    style={{ background: '#4CAF50', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Mark as Paid (Cash)
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {tab === 'issue' && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0.2rem' }}>Member Code</label>
                  <input autoFocus name="memberCode" value={formData.memberCode} onChange={handleChange} style={inputStyle} placeholder="e.g. MEM-1234" />
                </div>
              )}
              
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0.2rem' }}>Book Barcode</label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 14 }} />
                  <input 
                    autoFocus={tab !== 'issue'} 
                    name="barcode" 
                    value={formData.barcode} 
                    onChange={(e) => {
                      handleChange(e);
                      setShowDropdown(true);
                      if (selectedBookCopies) setSelectedBookCopies(null);
                    }}
                    onFocus={() => {
                      if (formData.barcode) setShowDropdown(true);
                    }}
                    onBlur={() => setShowDropdown(false)}
                    style={{ ...inputStyle, paddingLeft: '2.5rem' }} 
                    placeholder="Search title, author, genre, language, or ISBN..." 
                    autoComplete="off"
                  />
                  {showDropdown && formData.barcode && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {selectedBookCopies ? (
                        selectedBookCopies.length > 0 ? (
                          selectedBookCopies.map(copy => (
                            <div 
                              key={copy._id} 
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                setFormData(p => ({ ...p, barcode: copy.barcode }));
                                setShowDropdown(false);
                                setSelectedBookCopies(null);
                              }}
                              style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{copy.barcode}</span>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(129,199,132,0.15)', color: '#81C784', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{copy.condition}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No copies available for this action.</div>
                        )
                      ) : (
                        books.filter(b => 
                          (b.name || '').toLowerCase().includes(formData.barcode.toLowerCase()) || 
                          (b.author || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.genre || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.language || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.isbn || '').includes(formData.barcode)
                        ).slice(0, 8).map(book => (
                          <div 
                            key={book._id}
                            onMouseDown={async (e) => {
                              e.preventDefault(); // Prevent blur
                              try {
                                const copies = await bookApi.getCopies(book._id);
                                const filterStatus = tab === 'issue' ? 'available' : 'borrowed';
                                setSelectedBookCopies(copies.filter(c => c.status === filterStatus));
                              } catch (err) {
                                console.error('Failed to fetch copies', err);
                              }
                            }}
                            style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                          >
                            <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{book.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ISBN: {book.isbn} • {tab === 'issue' ? book.availableCopies : (book.totalCopies - book.availableCopies)} {tab === 'issue' ? 'available' : 'borrowed'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Return Tab: Live Return Preview Banner */}
              {tab === 'return' && previewLoading && (
                <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Checking loan status...
                </div>
              )}

              {tab === 'return' && previewData && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: previewData.fineAmount > 0 ? '1px solid rgba(239,83,80,0.3)' : '1px solid rgba(76,175,80,0.3)',
                  background: previewData.fineAmount > 0 ? 'rgba(239,83,80,0.08)' : 'rgba(76,175,80,0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: previewData.fineAmount > 0 ? '#EF5350' : '#4CAF50' }}>
                      {previewData.fineAmount > 0 
                        ? `Overdue by ${previewData.daysOverdue} day${previewData.daysOverdue > 1 ? 's' : ''}. Fine: ₹${previewData.fineAmount}`
                        : 'Returned on time, no fine'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due: {new Date(previewData.dueDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Book: <strong>{previewData.bookTitle}</strong> | Member: <strong>{previewData.memberName} ({previewData.memberCode})</strong>
                  </div>
                  {previewData.otherPendingFinesCount > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#FFB74D' }}>
                      Note: Member has {previewData.otherPendingFinesCount} other pending fine(s) totaling ₹{previewData.otherPendingFinesTotal}.
                    </div>
                  )}
                </div>
              )}

              {(tab === 'issue' || tab === 'renew') && (
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0.2rem' }}>Due Date</label>
                  <input type="date" name="dueDate" min={new Date().toISOString().split('T')[0]} value={formData.dueDate} onChange={handleChange} style={inputStyle} />
                </div>
              )}

              {tab === 'return' && previewData?.fineAmount > 0 ? (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleReturnProcess(true)}
                    style={{
                      flex: 1, background: '#4CAF50', color: '#fff', padding: '0.9rem',
                      border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : 'Return & Mark Fine Paid'}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleReturnProcess(false)}
                    style={{
                      flex: 1, background: 'var(--accent-gold)', color: '#fff', padding: '0.9rem',
                      border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : 'Return, Fine Stays Pending'}
                  </button>
                </div>
              ) : (
                <button type="submit" disabled={loading} style={{
                  background: loading ? 'var(--accent-gold-hover)' : 'var(--accent-gold)', color: '#fff', padding: '0.9rem',
                  border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '1rem'
                }}>
                  {loading ? 'Processing...' : tab === 'issue' ? 'Issue Book' : tab === 'return' ? 'Process Return' : 'Renew Book'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Column - Librarian Queue */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={18} color="#1565C0" className={loadingPending ? 'spin' : ''} /> Pending Queue
          </h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {pendingRequests.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
                <AlertCircle size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.9rem' }}>No pending reservations.</p>
              </div>
            ) : (
              pendingRequests.map(req => (
                <div key={req._id} style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {req.bookCopyId?.bookId?.name || 'Unknown Book'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>By {req.memberId?.name} ({req.memberId?.memberCode})</span>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Set Due Date (default: 14 days)</label>
                    <input 
                      type="date" 
                      value={pendingDueDates[req._id] || ''} 
                      onChange={e => setPendingDueDates(p => ({ ...p, [req._id]: e.target.value }))}
                      style={{ ...inputStyle, padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleApprove(req._id)} style={{ flex: 1, background: 'rgba(129,199,132,0.15)', color: '#81C784', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleReject(req._id)} style={{ flex: 1, background: 'rgba(239,83,80,0.15)', color: '#EF9A9A', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '0.8rem 1rem', background: 'var(--bg-hover)',
  border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)',
  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none'
}
