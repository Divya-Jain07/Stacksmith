import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Upload, Book, X, Edit3, Trash2, Layers } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useDialog } from '../../../context/DialogContext'
import { bookApi } from '../../../services/api'

export default function Catalog() {
  const { user } = useAuth()
  const { notify, confirm } = useDialog()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('book')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingBookId, setEditingBookId] = useState(null)
  const [formData, setFormData] = useState({ name: '', author: '', isbn: '', genre: '', publisher: '', yearPublished: '', language: '', description: '', numberOfCopies: 1 })
  const [modalLoading, setModalLoading] = useState(false)
  const fileInputRef = useRef(null)

  const [managingCopiesBook, setManagingCopiesBook] = useState(null)
  const [bookCopies, setBookCopies] = useState([])
  const [copiesLoading, setCopiesLoading] = useState(false)
  const [importNotice, setImportNotice] = useState(null)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const data = await bookApi.getBooks()
      setBooks(data)
    } catch (err) {
      setError('Failed to fetch catalog data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
    if (!importNotice) return
    const timer = window.setTimeout(() => setImportNotice(null), 6000)
    return () => window.clearTimeout(timer)
  }, [importNotice])

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setModalLoading(true)
    try {
      const payload = user?.adminId ? { ...formData, adminId: user.adminId } : formData
      if (editingBookId) {
        await bookApi.updateBook(editingBookId, payload)
      } else {
        await bookApi.createBook(payload)
      }
      setIsAddModalOpen(false)
      setEditingBookId(null)
      setFormData({ name: '', author: '', isbn: '', genre: '', publisher: '', yearPublished: '', language: '', description: '', numberOfCopies: 1 })
      fetchBooks()
    } catch (err) {
      notify(err.message || 'Failed to save book', 'error')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm('Are you sure you want to delete this book?', 'Delete Book');
    if (!confirmed) return;
    try {
      await bookApi.deleteBook(id);
      fetchBooks();
    } catch (err) {
      notify(err.message || 'Failed to delete book. (It might have borrowed copies)', 'error');
    }
  }

  const handleEdit = (book) => {
    setFormData({ name: book.name, author: book.author, isbn: book.isbn, genre: book.genre, publisher: book.publisher || '', yearPublished: book.yearPublished || '', language: book.language || '', description: book.description || '', numberOfCopies: book.totalCopies })
    setEditingBookId(book._id)
    setIsAddModalOpen(true)
  }

  const handleBulkImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    if (user?.adminId) {
      fd.append('adminId', user.adminId)
    }
    try {
      const res = await bookApi.bulkImport(fd)
      const messageParts = []
      if (res.added) messageParts.push(`${res.added} new book${res.added !== 1 ? 's' : ''}`)
      if (res.updated) messageParts.push(`${res.updated} existing book${res.updated !== 1 ? 's' : ''} updated`)
      if (res.invalid) messageParts.push(`${res.invalid} invalid row${res.invalid !== 1 ? 's' : ''}`)
      if (res.skipped) messageParts.push(`${res.skipped} failed row${res.skipped !== 1 ? 's' : ''}`)
      if (!messageParts.length) messageParts.push('No rows processed.')

      setImportNotice({
        type: res.errors?.length ? 'warning' : 'success',
        message: `Import complete: ${messageParts.join(', ')}.`
      })
      fetchBooks()
    } catch (err) {
      setImportNotice({ type: 'error', message: err.message || 'Failed to bulk import' })
    }
    e.target.value = ''
  }

  const handleManageCopies = async (book) => {
    setManagingCopiesBook(book)
    try {
      setCopiesLoading(true)
      const copies = await bookApi.getCopies(book._id)
      setBookCopies(copies)
    } catch (err) {
      notify('Failed to load copies', 'error')
    } finally {
      setCopiesLoading(false)
    }
  }

  const handleUpdateCopy = async (barcode, field, value) => {
    try {
      const payload = { [field]: value }
      await bookApi.updateCopy(barcode, payload)
      setBookCopies(prev => prev.map(c => c.barcode === barcode ? { ...c, [field]: value } : c))
      fetchBooks() // Refresh catalog counts
    } catch (err) {
      notify(err.message || 'Failed to update copy', 'error')
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
      {importNotice && (
        <div role="status" style={{
          marginBottom: '1rem',
          padding: '0.9rem 1rem',
          borderRadius: '10px',
          border: '1px solid',
          background: importNotice.type === 'error' ? 'rgba(239,83,80,0.15)' : importNotice.type === 'warning' ? 'rgba(255,193,7,0.14)' : 'rgba(76,175,80,0.16)',
          borderColor: importNotice.type === 'error' ? '#EF5350' : importNotice.type === 'warning' ? '#FFB300' : '#66BB6A',
          color: 'var(--text-main)',
          fontSize: '0.95rem'
        }}>
          {importNotice.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Manrope", sans-serif' }}>Library Catalog</h2>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Showing {filteredBooks.length} of {books.length} books</span>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input type="file" ref={fileInputRef} onChange={handleBulkImport} accept=".csv" style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}>
            <Upload size={16} /> Bulk Import CSV
          </button>
          <button onClick={() => { setEditingBookId(null); setFormData({ name: '', author: '', isbn: '', genre: '', publisher: '', yearPublished: '', language: '', description: '', numberOfCopies: 1 }); setIsAddModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-gold)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            <Plus size={16} /> Add Book
          </button>
        </div>
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
                <th style={{ padding: '1rem' }}>Total/Avail</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading catalog...</td></tr>
              ) : filteredBooks.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No books found in inventory.</td></tr>
              ) : (
                filteredBooks.map((book, idx) => (
                  <tr key={book._id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.9rem', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 42, background: 'var(--bg-hover)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Book size={16} color="var(--text-muted)"/></div>
                      <span style={{ fontWeight: 500 }}>{book.name}</span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{book.author}</td>
                    <td style={{ padding: '1rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{book.isbn}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ background: 'var(--bg-hover)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{book.genre}</span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>{book.totalCopies || 0}</span> total <br/>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{book.availableCopies || 0}</span> avail
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button onClick={() => handleManageCopies(book)} style={{ background: 'none', border: 'none', color: '#81C784', cursor: 'pointer', padding: '0.25rem' }} title="Manage Copies"><Layers size={16} /></button>
                      <button onClick={() => handleEdit(book)} style={{ background: 'none', border: 'none', color: '#1565C0', cursor: 'pointer', padding: '0.25rem' }} title="Edit"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(book._id)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer', padding: '0.25rem' }} title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '450px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>{editingBookId ? 'Edit Book' : 'Add New Book'}</h3>
                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input placeholder="Title" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} required style={inputStyle} />
                <input placeholder="Author" value={formData.author} onChange={e => setFormData(p => ({...p, author: e.target.value}))} required style={inputStyle} />
                <input placeholder="ISBN" value={formData.isbn} onChange={e => setFormData(p => ({...p, isbn: e.target.value}))} required style={inputStyle} />
                <input placeholder="Genre" value={formData.genre} onChange={e => setFormData(p => ({...p, genre: e.target.value}))} required style={inputStyle} />
                <input placeholder="Publisher" value={formData.publisher} onChange={e => setFormData(p => ({...p, publisher: e.target.value}))} required style={inputStyle} />
                <input placeholder="Year Published" type="number" value={formData.yearPublished} onChange={e => setFormData(p => ({...p, yearPublished: e.target.value}))} required style={inputStyle} />
                <input placeholder="Language" value={formData.language} onChange={e => setFormData(p => ({...p, language: e.target.value}))} required style={inputStyle} />
                {!editingBookId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Initial Copies</label>
                    <input type="number" min="1" placeholder="Initial Copies" value={formData.numberOfCopies} onChange={e => setFormData(p => ({...p, numberOfCopies: parseInt(e.target.value, 10)}))} required style={inputStyle} />
                  </div>
                )}
                <textarea placeholder="Description" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} style={{...inputStyle, minHeight: '80px'}} />
                <button type="submit" disabled={modalLoading} style={{ background: 'var(--accent-gold)', color: '#fff', padding: '0.85rem', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: modalLoading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>{modalLoading ? 'Saving...' : 'Save Book'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {managingCopiesBook && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', margin: 0 }}>Manage Copies: {managingCopiesBook.name}</h3>
                <button onClick={() => setManagingCopiesBook(null)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}><X size={20}/></button>
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {copiesLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Loading copies...</div>
                ) : bookCopies.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No copies found.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.75rem' }}>Barcode</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem' }}>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookCopies.map(copy => (
                        <tr key={copy._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85rem', color: 'var(--text-main)' }}>{copy.barcode}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <select 
                              value={copy.status} 
                              onChange={(e) => handleUpdateCopy(copy.barcode, 'status', e.target.value)}
                              style={{ ...inputStyle, padding: '0.4rem', fontSize: '0.8rem' }}
                            >
                              <option value="available">Available</option>
                              <option value="borrowed">Borrowed</option>
                              <option value="reserved">Reserved</option>
                              <option value="lost">Lost</option>
                              <option value="damaged">Damaged</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <select 
                              value={copy.condition} 
                              onChange={(e) => handleUpdateCopy(copy.barcode, 'condition', e.target.value)}
                              style={{ ...inputStyle, padding: '0.4rem', fontSize: '0.8rem' }}
                            >
                              <option value="perfect">Perfect</option>
                              <option value="okay">Okay</option>
                              <option value="poor">Poor</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }
