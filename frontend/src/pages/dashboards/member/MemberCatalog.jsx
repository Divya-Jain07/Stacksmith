import { useState, useEffect } from 'react'
import { Search, Book, Clock, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { bookApi, borrowApi } from '../../../services/api'
import { useDialog } from '../../../context/DialogContext'

export default function MemberCatalog() {
  const [books, setBooks] = useState([])
  const { notify } = useDialog()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('book')
  const [requestLoading, setRequestLoading] = useState(null)
  const [requestModal, setRequestModal] = useState({ open: false, book: null })
  const [detailsModal, setDetailsModal] = useState(null)
  const fetchBooks = async () => {
    try {
      setLoading(true)
      const data = await bookApi.getBooks()
      setBooks(data)
    } catch (err) {
      setError('Failed to load the library catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  const handleRequestBook = async (book) => {
    if (book.availableCopies === 0) {
      notify('This book is currently out of stock.', 'warning')
      return
    }
    setRequestModal({ open: true, book })
  }

  const confirmRequest = async () => {
    const book = requestModal.book;
    if (!book) return;

    try {
      setRequestLoading(book._id)
      await borrowApi.memberRequestBook({ bookId: book._id })
      notify('Book requested successfully! Please pick it up at the counter.', 'success')
      fetchBooks() // Refresh available counts
    } catch (err) {
      notify(err.message || 'Failed to request book', 'error')
    } finally {
      setRequestLoading(null)
      setRequestModal({ open: false, book: null })
    }
  }

  const filteredBooks = books.filter(b => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (searchField === 'book') return (b.name || '').toLowerCase().includes(q) || (b.isbn || '').includes(search);
    if (searchField === 'author') return (b.author || '').toLowerCase().includes(q);
    if (searchField === 'genre') return (b.genre || '').toLowerCase().includes(q);
    if (searchField === 'language') return (b.language || '').toLowerCase().includes(q);
    return true;
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Averia Sans Libre", system-ui' }}>Library Catalog</h2>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Showing {filteredBooks.length} of {books.length} books</span>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ position: 'relative', maxWidth: '500px', display: 'flex', gap: '0.5rem' }}>
            <select 
              value={searchField} onChange={e => setSearchField(e.target.value)}
              style={{ padding: '0.65rem 1rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', minWidth: '120px' }}
            >
              <option value="book">Title / ISBN</option>
              <option value="author">Author</option>
              <option value="genre">Genre</option>
              <option value="language">Language</option>
            </select>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search by ${searchField === 'book' ? 'Title or ISBN' : searchField}...`} 
                style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.25rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem' }}>Title</th>
                <th style={{ padding: '1rem' }}>Author</th>
                <th style={{ padding: '1rem' }}>ISBN</th>
                <th style={{ padding: '1rem' }}>Genre</th>
                <th style={{ padding: '1rem' }}>Availability</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading catalog...</td></tr>
              ) : filteredBooks.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No books found.</td></tr>
              ) : (
                filteredBooks.map((book, idx) => (
                  <tr key={book._id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 42, background: 'var(--bg-hover)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Book size={16} color="var(--text-muted)"/></div>
                      <span onClick={() => setDetailsModal(book)} style={{ fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent-gold)' }}>{book.name}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{book.author}</td>
                    <td style={{ padding: '1rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{book.isbn}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{book.genre}</span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <span style={{ color: book.availableCopies > 0 ? 'var(--accent-gold)' : '#EF5350', fontWeight: 600 }}>
                        {book.availableCopies || 0}
                      </span> / {book.totalCopies || 0}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleRequestBook(book)}
                        disabled={book.availableCopies === 0 || requestLoading === book._id}
                        style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          background: book.availableCopies === 0 ? 'var(--bg-hover)' : 'var(--accent-gold)', 
                          color: book.availableCopies === 0 ? 'var(--text-muted)' : '#fff', 
                          border: 'none', padding: '0.5rem 0.85rem', borderRadius: '6px', 
                          cursor: book.availableCopies === 0 ? 'not-allowed' : 'pointer', 
                          fontWeight: 600, fontSize: '0.8rem' 
                        }}
                      >
                        {requestLoading === book._id ? 'Requesting...' : <><Clock size={14} /> Request</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {requestModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Confirm Request</h3>
                <button onClick={() => setRequestModal({ open: false, book: null })} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                Are you sure you want to request a copy of <strong style={{ color: 'var(--text-main)' }}>{requestModal.book?.name}</strong>? 
                <br/><br/>
                Please pick it up at the counter once requested.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setRequestModal({ open: false, book: null })} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-main)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmRequest} disabled={requestLoading} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--accent-gold)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                  {requestLoading ? 'Requesting...' : 'Confirm Request'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailsModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Book Details</h3>
                <button onClick={() => setDetailsModal(null)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Title:</strong> <span>{detailsModal.name}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Author:</strong> <span>{detailsModal.author}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>ISBN:</strong> <span>{detailsModal.isbn}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Genre:</strong> <span>{detailsModal.genre}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Publisher:</strong> <span>{detailsModal.publisher || 'N/A'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Published:</strong> <span>{detailsModal.yearPublished || 'N/A'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Language:</strong> <span>{detailsModal.language || 'N/A'}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Availability:</strong> <span>{detailsModal.availableCopies} / {detailsModal.totalCopies}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}><strong style={{ color: 'var(--text-muted)' }}>Description:</strong> <span style={{ lineHeight: '1.4' }}>{detailsModal.description || 'No description available.'}</span></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
