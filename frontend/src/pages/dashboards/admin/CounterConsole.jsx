import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, CheckCircle, AlertCircle, RefreshCw, XCircle, Clock, DollarSign } from 'lucide-react'
import { borrowApi, bookApi, fineApi } from '../../../services/api'
import { useDialog } from '../../../context/DialogContext'

const CURRENCY = '₹'

export default function CounterConsole() {
  const location = useLocation()
  const { notify } = useDialog()
  const [tab, setTab] = useState(location.state?.defaultTab || 'issue')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({ memberCode: '', barcode: '', dueDate: '' })

  const [pendingRequests, setPendingRequests] = useState([])
  const [loadingPending, setLoadingPending] = useState(false)
  const [pendingDueDates, setPendingDueDates] = useState({})

  // Book search autocomplete
  const [books, setBooks] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedBookCopies, setSelectedBookCopies] = useState(null)

  // ── Return tab state ──────────────────────────────────────────────────────
  const [returnPreview, setReturnPreview] = useState(null)   // preview data
  const [previewLoading, setPreviewLoading] = useState(false)
  const [returnResult, setReturnResult] = useState(null)     // result card after return
  const [previewBarcode, setPreviewBarcode] = useState('')   // barcode that was previewed

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

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 15000)

    const fetchBooks = async () => {
      const cachedBooks = bookApi.getCachedBooks()
      if (cachedBooks) { setBooks(cachedBooks); return }
      try { const data = await bookApi.getBooks(); setBooks(data) }
      catch (err) { console.error('Failed to fetch catalog', err) }
    }
    fetchBooks()
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (location.state?.defaultTab) setTab(location.state.defaultTab)
  }, [location.state])

  const handleApprove = async (id) => {
    try {
      let dueDateStr = pendingDueDates[id]
      if (!dueDateStr) {
        const d = new Date(); d.setDate(d.getDate() + 14); dueDateStr = d.toISOString()
      } else {
        dueDateStr = new Date(dueDateStr).toISOString()
      }
      await borrowApi.confirmIssue(id, { dueDate: dueDateStr })
      notify('Request approved and book issued.', 'success')
      fetchPending()
    } catch (err) { notify(err.message || 'Failed to approve request', 'error') }
  }

  const handleReject = async (id) => {
    try {
      await borrowApi.cancelMemberRequest(id)
      notify('Request rejected.', 'success')
      fetchPending()
    } catch (err) { notify(err.message || 'Failed to reject request', 'error') }
  }

  const handleChange = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
    setError(null)
    // Reset return state when barcode changes
    if (e.target.name === 'barcode') {
      setReturnPreview(null)
      setReturnResult(null)
      setPreviewBarcode('')
    }
  }

  // ── Return: load preview when barcode field loses focus ─────────────────
  const handleBarcodeBlur = async () => {
    setShowDropdown(false)
    if (tab === 'return' && formData.barcode.trim() && formData.barcode.trim() !== previewBarcode) {
      setPreviewLoading(true)
      setReturnPreview(null)
      setReturnResult(null)
      try {
        const preview = await borrowApi.previewReturn(formData.barcode.trim())
        setReturnPreview(preview)
        setPreviewBarcode(formData.barcode.trim())
      } catch (err) {
        // Not currently borrowed — just show nothing, the submit will give the real error
        setReturnPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }
  }

  // ── Handle return submission (with optional immediate pay) ───────────────
  const processReturn = async (markPaid = false) => {
    const trimmedBarcode = formData.barcode.trim()
    if (!trimmedBarcode) { setError('Barcode required for Return'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await borrowApi.returnBook({ barcode: trimmedBarcode })

      // Show the result card
      setReturnResult({ ...res, markedPaid: false })
      setFormData({ memberCode: '', barcode: '', dueDate: '' })
      setReturnPreview(null)
      setPreviewBarcode('')

      // If staff wanted to collect fine immediately
      if (markPaid && res.fineId) {
        try {
          await fineApi.payFine(res.fineId)
          setReturnResult(prev => ({ ...prev, markedPaid: true }))
        } catch (payErr) {
          // Return worked, payment failed — tell them clearly
          notify(`Book returned! But marking fine as paid failed: ${payErr.message}. The fine is still pending.`, 'warning')
        }
      }
    } catch (err) {
      setError(err.message || 'Return failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkResultPaid = async () => {
    if (!returnResult?.fineId) return
    try {
      await fineApi.payFine(returnResult.fineId)
      setReturnResult(prev => ({ ...prev, markedPaid: true }))
      notify('Fine marked as paid.', 'success')
    } catch (err) {
      notify(err.message || 'Failed to mark fine as paid', 'error')
    }
  }

  // ── Generic form submit for Issue and Renew ───────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShowDropdown(false)

    try {
      const trimmedMemberCode = formData.memberCode.trim()
      const trimmedBarcode = formData.barcode.trim()

      if (tab === 'issue') {
        if (!trimmedMemberCode || !trimmedBarcode || !formData.dueDate) throw new Error('All fields required for Issue')
        await borrowApi.issueBook({ memberCode: trimmedMemberCode, barcode: trimmedBarcode, dueDate: formData.dueDate })
        notify(`Book issued successfully to ${trimmedMemberCode}`, 'success')
        setFormData({ memberCode: '', barcode: '', dueDate: '' })
      } else if (tab === 'renew') {
        if (!trimmedBarcode || !formData.dueDate) throw new Error('Barcode and new Due Date required for Renew')
        await borrowApi.renewBorrowing({ barcode: trimmedBarcode, newDueDate: formData.dueDate })
        notify(`Book renewed successfully until ${formData.dueDate}`, 'success')
        setFormData({ memberCode: '', barcode: '', dueDate: '' })
      }
    } catch (err) {
      setError(err.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: '0 0 1.5rem', fontFamily: '"Manrope", sans-serif' }}>Counter Console</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '2rem' }}>
        {/* Left Column */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
            {['issue', 'return', 'renew'].map(t => (
              <button key={t} onClick={() => { setTab(t); setShowDropdown(false); setSelectedBookCopies(null); setReturnPreview(null); setReturnResult(null); setError(null) }}
                style={{ flex: 1, padding: '1rem', background: tab === t ? 'var(--accent-gold-hover)' : 'transparent', border: 'none', color: tab === t ? 'var(--accent-gold)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize', transition: '0.2s', borderBottom: tab === t ? '2px solid var(--accent-gold)' : '2px solid transparent' }}>
                {t} Book
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {error && <div style={{ background: 'rgba(239,83,80,0.1)', color: '#EF9A9A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18}/> {error}</div>}

            {/* ── Return result card ─────────────────────────────────────── */}
            <AnimatePresence>
              {returnResult && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px', border: `1px solid ${returnResult.daysOverdue > 0 ? 'rgba(239,83,80,0.3)' : 'rgba(129,199,132,0.3)'}`, background: returnResult.daysOverdue > 0 ? 'rgba(239,83,80,0.06)' : 'rgba(129,199,132,0.06)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                    ✅ Return Processed
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    {returnResult.bookTitle && <span><strong style={{ color: 'var(--text-main)' }}>Book:</strong> {returnResult.bookTitle}</span>}
                    {returnResult.memberName && <span><strong style={{ color: 'var(--text-main)' }}>Member:</strong> {returnResult.memberName} ({returnResult.memberCode})</span>}
                    {returnResult.returnedDate && <span><strong style={{ color: 'var(--text-main)' }}>Returned:</strong> {new Date(returnResult.returnedDate).toLocaleDateString('en-GB')}</span>}
                  </div>

                  {returnResult.daysOverdue > 0 ? (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,83,80,0.12)', borderRadius: '8px', color: '#EF9A9A', fontWeight: 600 }}>
                      Overdue by {returnResult.daysOverdue} day{returnResult.daysOverdue !== 1 ? 's' : ''} — Fine: {CURRENCY}{returnResult.fineAmount}
                      {returnResult.markedPaid
                        ? <span style={{ marginLeft: '0.75rem', color: '#81C784', fontSize: '0.85rem', fontWeight: 500 }}>✓ Paid</span>
                        : returnResult.fineId && (
                          <button onClick={handleMarkResultPaid} style={{ marginLeft: '0.75rem', background: 'rgba(129,199,132,0.15)', color: '#81C784', border: '1px solid rgba(129,199,132,0.3)', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            Mark as Paid
                          </button>
                        )
                      }
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.75rem', color: '#81C784', fontWeight: 600, fontSize: '0.9rem' }}>
                      ✓ Returned on time — No fine
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Return form ───────────────────────────────────────────── */}
            {tab === 'return' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0.2rem' }}>Book Barcode</label>
                  <input
                    autoFocus
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    onBlur={handleBarcodeBlur}
                    style={inputStyle}
                    placeholder="Scan or type barcode..."
                    autoComplete="off"
                  />
                </div>

                {/* Preview panel */}
                <AnimatePresence>
                  {previewLoading && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Checking return status...</div>
                  )}
                  {returnPreview && !previewLoading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '1.25rem', borderRadius: '12px', border: `1px solid ${returnPreview.daysOverdue > 0 ? 'rgba(239,83,80,0.35)' : 'rgba(129,199,132,0.35)'}`, background: returnPreview.daysOverdue > 0 ? 'rgba(239,83,80,0.07)' : 'rgba(129,199,132,0.07)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        {returnPreview.bookTitle && <span><strong style={{ color: 'var(--text-main)' }}>Book:</strong> {returnPreview.bookTitle}</span>}
                        {returnPreview.memberName && <span><strong style={{ color: 'var(--text-main)' }}>Member:</strong> {returnPreview.memberName} ({returnPreview.memberCode})</span>}
                        {returnPreview.dueDate && <span><strong style={{ color: 'var(--text-main)' }}>Due Date:</strong> {new Date(returnPreview.dueDate).toLocaleDateString('en-GB')}</span>}
                      </div>

                      {returnPreview.daysOverdue > 0 ? (
                        <>
                          <div style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', background: 'rgba(239,83,80,0.15)', color: '#EF9A9A', fontWeight: 700, marginBottom: '0.75rem' }}>
                            Overdue by {returnPreview.daysOverdue} day{returnPreview.daysOverdue !== 1 ? 's' : ''} — Fine: {CURRENCY}{returnPreview.fineAmount}
                          </div>
                          {returnPreview.otherPendingFinesCount > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                              Member also has {returnPreview.otherPendingFinesCount} other pending fine{returnPreview.otherPendingFinesCount !== 1 ? 's' : ''} totalling {CURRENCY}{returnPreview.otherPendingFinesTotal}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button disabled={loading} onClick={() => processReturn(true)}
                              style={{ flex: 1, background: 'rgba(129,199,132,0.15)', color: '#81C784', border: '1px solid rgba(129,199,132,0.3)', padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                              {loading ? 'Processing...' : 'Return & Mark Paid'}
                            </button>
                            <button disabled={loading} onClick={() => processReturn(false)}
                              style={{ flex: 1, background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
                              {loading ? '...' : 'Return, Fine Pending'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ color: '#81C784', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>✓ Returned on time — No fine</div>
                          <button disabled={loading} onClick={() => processReturn(false)}
                            style={{ width: '100%', background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                            {loading ? 'Processing...' : 'Process Return'}
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                  {!returnPreview && !previewLoading && formData.barcode && (
                    <button disabled={loading} onClick={() => processReturn(false)}
                      style={{ background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, marginTop: '0.5rem' }}>
                      {loading ? 'Processing...' : 'Process Return'}
                    </button>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* ── Issue / Renew form ──────────────────────────────────── */
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
                      onChange={(e) => { handleChange(e); setShowDropdown(true); if (selectedBookCopies) setSelectedBookCopies(null) }}
                      onFocus={() => { if (formData.barcode) setShowDropdown(true) }}
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
                              <div key={copy._id} onMouseDown={(e) => { e.preventDefault(); setFormData(p => ({ ...p, barcode: copy.barcode })); setShowDropdown(false); setSelectedBookCopies(null) }}
                                style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            <div key={book._id} onMouseDown={async (e) => {
                              e.preventDefault()
                              try {
                                const copies = await bookApi.getCopies(book._id)
                                const filterStatus = tab === 'issue' ? 'available' : 'borrowed'
                                setSelectedBookCopies(copies.filter(c => c.status === filterStatus))
                              } catch (err) { console.error('Failed to fetch copies', err) }
                            }}
                              style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>{book.name}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ISBN: {book.isbn} • {tab === 'issue' ? book.availableCopies : (book.totalCopies - book.availableCopies)} {tab === 'issue' ? 'available' : 'borrowed'}</span>
                            </div>
                          ))
                        )}
                        {!selectedBookCopies && books.filter(b =>
                          (b.name || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.author || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.genre || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.language || '').toLowerCase().includes(formData.barcode.toLowerCase()) ||
                          (b.isbn || '').includes(formData.barcode)
                        ).length === 0 && (
                          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No matching books found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {(tab === 'issue' || tab === 'renew') && (
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0.2rem' }}>Due Date</label>
                    <input type="date" name="dueDate" min={new Date().toISOString().split('T')[0]} value={formData.dueDate} onChange={handleChange} style={inputStyle} />
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ background: loading ? 'var(--accent-gold-hover)' : 'var(--accent-gold)', color: '#fff', padding: '0.9rem', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '1rem' }}>
                  {loading ? 'Processing...' : tab === 'issue' ? 'Issue Book' : 'Renew Book'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column — Pending Queue */}
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    By {req.memberId?.name} ({req.memberId?.memberCode})
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Set Due Date (default: 14 days)</label>
                    <input type="date" value={pendingDueDates[req._id] || ''} onChange={e => setPendingDueDates(p => ({ ...p, [req._id]: e.target.value }))}
                      style={{ ...inputStyle, padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleApprove(req._id)}
                      style={{ flex: 1, background: 'rgba(129,199,132,0.15)', color: '#81C784', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleReject(req._id)}
                      style={{ flex: 1, background: 'rgba(239,83,80,0.15)', color: '#EF9A9A', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
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
