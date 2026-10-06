/**
 * services/api.js — Stacksmith API Service Layer
 *
 * Centralises all HTTP calls to the Express backend.
 * Every call automatically attaches the Bearer token from localStorage.
 *
 * Backend base URL is read from the Vite env variable VITE_API_URL.
 * Defaults to '' (empty string) so the Vite dev-server proxy handles it:
 *   /api/* → http://localhost:5000  (configured in vite.config.js)
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

/* ── Internal fetch wrapper ─────────────────────────────────────────────── */

async function request(method, path, body = null, skipAuth = false) {
  const headers = { 'Content-Type': 'application/json' }

  if (!skipAuth) {
    const token = localStorage.getItem('stacksmith_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, options)

  // Parse JSON (or empty body for 204)
  const data = res.status !== 204 ? await res.json().catch(() => ({})) : {}

  if (!res.ok) {
    // Normalise error — backend sends { error: '...' }
    const message = data?.error ?? `Request failed with status ${res.status}`
    throw Object.assign(new Error(message), { status: res.status, data })
  }

  return data
}

/* ── Public helpers ─────────────────────────────────────────────────────── */

const get    = (path)        => request('GET',    path)
const post   = (path, body)  => request('POST',   path, body)
const put    = (path, body)  => request('PUT',    path, body)
const patch  = (path, body)  => request('PATCH',  path, body)
const del    = (path)        => request('DELETE', path)

const CATALOG_CACHE_TTL = 60_000
const catalogCache = new Map()

const getCatalogCacheKey = (params = '') => params || '__all__'

function getCachedCatalog(params = '') {
  const cached = catalogCache.get(getCatalogCacheKey(params))
  return cached?.data ?? null
}

function clearCatalogCache() {
  catalogCache.clear()
}

async function getBooksWithCache(params = '', options = {}) {
  const key = getCatalogCacheKey(params)
  const cached = catalogCache.get(key)
  const now = Date.now()

  if (!options.force && cached?.data && now - cached.timestamp < CATALOG_CACHE_TTL) {
    return cached.data
  }

  if (!options.force && cached?.promise) {
    return cached.promise
  }

  const promise = get(`/api/books${params}`)
    .then((data) => {
      catalogCache.set(key, { data, timestamp: Date.now(), promise: null })
      return data
    })
    .catch((error) => {
      if (cached?.data) {
        catalogCache.set(key, { ...cached, promise: null })
      } else {
        catalogCache.delete(key)
      }
      throw error
    })

  catalogCache.set(key, {
    data: cached?.data ?? null,
    timestamp: cached?.timestamp ?? 0,
    promise
  })

  return promise
}

async function mutateCatalog(mutator) {
  const data = await mutator()
  clearCatalogCache()
  return data
}

/* ── Auth endpoints ─────────────────────────────────────────────────────── */

export const authApi = {
  /**
   * Staff login (SuperAdmin · Admin · Librarian)
   * POST /api/auth/staff-login
   * Body: { email, password }
   * Returns: { token, user: { id, name, email, role, adminId, staffId, staffProfileId } }
   */
  staffLogin: (email, password) =>
    request('POST', '/api/auth/staff-login', { email, password }, true),

  /**
   * Member login
   * POST /api/auth/member-login
   * Body: { memberCode, password }
   * Returns: { token, user: { id, name, email, role, adminId, memberCode, memberProfileId } }
   */
  memberLogin: (memberCode, password) =>
    request('POST', '/api/auth/member-login', { memberCode, password }, true),

  /**
   * Create Branch Admin (SuperAdmin only)
   * POST /api/auth/create-admin
   */
  createAdmin: (data) =>
    post('/api/auth/create-admin', data),

  /**
   * Create Librarian (Admin only)
   * POST /api/auth/create-librarian
   */
  createLibrarian: (data) =>
    post('/api/auth/create-librarian', data),

  /**
   * Change password (any authenticated user)
   * PUT /api/auth/change-password
   */
  changePassword: (oldPassword, newPassword) =>
    put('/api/auth/change-password', { oldPassword, newPassword }),
}

/* ── Admin & Reports ────────────────────────────────────────────────────── */

export const adminApi = {
  /**
   * Get Global Analytics (SuperAdmin only)
   * GET /api/admin/stats
   */
  getStats: () => get('/api/admin/stats'),
  updateAdmin: (id, data) => put(`/api/admin/${id}`, data),
  deleteAdmin: (id) => del(`/api/admin/${id}`),
  getLibrarians: () => get('/api/admin/librarians'),
  deleteLibrarian: (id) => del(`/api/admin/librarians/${id}`),
}

export const reportApi = {
  /**
   * Get Dashboard Analytics (Admin/Librarian)
   * GET /api/reports/dashboard
   */
  getDashboard: () => get('/api/reports/dashboard'),
}

export const bookApi = {
  getBooks: (params = '', options = {}) => getBooksWithCache(params, options),
  getCachedBooks: (params = '') => getCachedCatalog(params),
  clearCache: clearCatalogCache,
  getBookById: (id) => get(`/api/books/${id}`),
  createBook: (data) => mutateCatalog(() => post('/api/books', data)),
  updateBook: (id, data) => mutateCatalog(() => put(`/api/books/${id}`, data)),
  deleteBook: (id) => mutateCatalog(() => del(`/api/books/${id}`)),
  addCopy: (bookId, data) => mutateCatalog(() => post(`/api/books/${bookId}/copies`, data)),
  getCopies: (bookId) => get(`/api/books/${bookId}/copies`),
  updateCopy: (barcode, data) => mutateCatalog(() => put(`/api/copies/${barcode}`, data)),
  bulkImport: (formData) => {
    // Requires a custom fetch since it uses FormData, not JSON.
    const token = localStorage.getItem('stacksmith_token')
    return mutateCatalog(() => fetch(`${BASE}/api/books/bulk-import`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data?.error || `Request failed with status ${res.status}`
        throw Object.assign(new Error(message), { status: res.status, data })
      }
      return data
    }))
  },
  searchBooks: (query) => getBooksWithCache(`/search?q=${encodeURIComponent(query)}`),
  getSimilarBooks: (id) => getBooksWithCache(`/${id}/similar`)
}

export const borrowApi = {
  // Members
  memberRequestBook: (data) => mutateCatalog(() => post('/api/borrow/request', data)),
  cancelMemberRequest: (id) => mutateCatalog(() => del(`/api/borrow/${id}/cancel`)),
  
  // Staff
  issueBook: (data) => mutateCatalog(() => post('/api/borrow/issue', data)),
  returnBook: (data) => mutateCatalog(() => post('/api/borrow/return', data)),
  renewBorrowing: (data) => mutateCatalog(() => post('/api/borrow/renew', data)),
  
  // Requests
  getPendingRequests: () => get('/api/borrow/pending'),
  previewReturn: (barcode) => get(`/api/borrow/preview-return/${encodeURIComponent(barcode)}`),
  confirmIssue: (id, data) => mutateCatalog(() => patch(`/api/borrow/${id}/confirm-issue`, data)),
  confirmReturn: (id) => mutateCatalog(() => patch(`/api/borrow/${id}/confirm-return`))
}

export const memberApi = {
  getMembers: () => get('/api/members'),
  getMemberById: (id) => get(`/api/members/${id}`),
  createMember: (data) => post('/api/members', data),
  updateMember: (id, data) => put(`/api/members/${id}`, data),
  getMyBorrowings: () => get('/api/members/me/borrowings'),
  getMyFines: () => get('/api/members/me/fines')
}

export const fineApi = {
  // Branch-level fines list (staff)
  getBranchFines: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v) })
    return get(`/api/fines?${qs.toString()}`)
  },
  getMemberFines: (memberId) => get(`/api/fines/member/${memberId}`),
  payFine: (id) => post(`/api/fines/${id}/pay`, {}),
  waiveFine: (id, waiverReason) => post(`/api/fines/${id}/waive`, { waiverReason })
}

export const chatApi = {
  getConversations: (status = '') => get(`/api/chat/conversations${status ? `?status=${status}` : ''}`),
  getUnassigned: () => get('/api/chat/conversations/unassigned'),
  createConversation: () => post('/api/chat/conversations', {}),
  getMessages: (id) => get(`/api/chat/conversations/${id}/messages`),
  sendMessage: (id, message) => post(`/api/chat/conversations/${id}/messages`, { message }),
  closeConversation: (id) => patch(`/api/chat/conversations/${id}/close`)
}

/* ── Generic resource exports ───────────────────────────────────────────── */

export default { get, post, put, patch, del }
