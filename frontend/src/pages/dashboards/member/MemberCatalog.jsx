import { useState, useEffect } from 'react'
import { Search, Book, Clock } from 'lucide-react'
import { bookApi, borrowApi } from '../../../services/api'

export default function MemberCatalog() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('book')
  const [requestLoading, setRequestLoading] = useState(null)

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
      alert('This book is currently out of stock.')
      return
    }

    if (!window.confirm(`Request a copy of "${book.name}"?`)) return;

    try {
      setRequestLoading(book._id)
      await borrowApi.memberRequestBook({ bookId: book._id })
      alert('Book requested successfully! Please pick it up at the counter.')
      fetchBooks() // Refresh available counts
    } catch (err) {
      alert(err.message || 'Failed to request book')
    } finally {
      setRequestLoading(null)
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
                      <span style={{ fontWeight: 500 }}>{book.name}</span>
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
    </div>
  )
}
