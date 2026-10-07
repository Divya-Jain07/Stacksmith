import { useEffect, useState } from 'react'
import { BookOpen, Search, Sparkles, X } from 'lucide-react'
import { bookApi } from '../../../services/api'
import layoutStyles from './MemberBookRecommendations.module.css'

export default function MemberRecommendations() {
  const [books, setBooks] = useState([])
  const [query, setQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    bookApi.getBooks()
      .then(setBooks)
      .catch(() => setError('Failed to load books from the catalog.'))
      .finally(() => setLoadingBooks(false))
  }, [])

  const matchingBooks = query.trim()
    ? books.filter(book => `${book.name} ${book.author} ${book.isbn}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  const chooseBook = async (book) => {
    setSelectedBook(book)
    setQuery(book.name)
    setRecommendations([])
    setError('')
    setLoadingRecommendations(true)
    try {
      const similarBooks = await bookApi.getSimilarBooks(book._id)
      setRecommendations(similarBooks.slice(0, 10))
    } catch {
      setError('Failed to find recommendations for this book.')
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const clearSelection = () => {
    setSelectedBook(null)
    setRecommendations([])
    setQuery('')
    setError('')
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', margin: 0, fontFamily: '"Averia Sans Libre", system-ui' }}>Recommend me</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>Choose a book to discover titles with similar themes and content.</p>
      </div>

      <div style={{ position: 'relative', maxWidth: '680px', marginBottom: '1.5rem' }}>
        <Search size={17} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={query}
          onChange={event => { setQuery(event.target.value); setSelectedBook(null); setRecommendations([]); setError('') }}
          placeholder={loadingBooks ? 'Loading catalog...' : 'Enter a book title, author, or ISBN'}
          aria-label="Search for a book to get recommendations"
          disabled={loadingBooks}
          style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem 2.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
        />
        {query && <button type="button" onClick={clearSelection} aria-label="Clear book selection" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={17} /></button>}
        {!selectedBook && matchingBooks.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 5, top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 12px 28px rgba(0,0,0,0.18)' }}>
            {matchingBooks.map(book => (
              <button key={book._id} type="button" onClick={() => chooseBook(book)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '0.7rem 1rem', border: 0, borderBottom: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ fontWeight: 600 }}>{book.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{book.author}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div role="alert" style={{ color: '#EF9A9A', marginBottom: '1rem' }}>{error}</div>}

      {selectedBook && (
        <div className={layoutStyles.recommendationColumns}>
          <section style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><BookOpen size={16} /> Selected book</div>
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1.15rem' }}>{selectedBook.name}</h3>
            <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{selectedBook.author}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.55rem 0.8rem', fontSize: '0.88rem', color: 'var(--text-main)' }}>
              <strong style={{ color: 'var(--text-muted)' }}>Genre</strong><span>{selectedBook.genre || 'N/A'}</span>
              <strong style={{ color: 'var(--text-muted)' }}>ISBN</strong><span>{selectedBook.isbn || 'N/A'}</span>
              <strong style={{ color: 'var(--text-muted)' }}>Description</strong><span style={{ lineHeight: 1.5 }}>{selectedBook.description || 'No description available.'}</span>
            </div>
          </section>

          <section style={{ minWidth: 0 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', margin: '0 0 1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}><Sparkles size={17} /> Top recommendations</h3>
            {loadingRecommendations ? (
              <div style={{ color: 'var(--text-muted)' }}>Finding similar books...</div>
            ) : recommendations.length ? (
              <div className={layoutStyles.recommendationList} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recommendations.map((book, index) => (
                  <div key={book._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.8rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '1.4rem' }}>{index + 1}.</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{book.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{book.author}</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{Math.round(book.similarity * 100)}% match</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No similar books found in this branch.</div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}