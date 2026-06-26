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
  getBooks: (params = '') => get(`/api/books${params}`),
  getBookById: (id) => get(`/api/books/${id}`),
  createBook: (data) => post('/api/books', data),
  updateBook: (id, data) => put(`/api/books/${id}`, data),
  deleteBook: (id) => del(`/api/books/${id}`),
  addCopy: (bookId, data) => post(`/api/books/${bookId}/copies`, data),
  getCopies: (bookId) => get(`/api/books/${bookId}/copies`),
  updateCopy: (barcode, data) => put(`/api/copies/${barcode}`, data),
  bulkImport: (formData) => {
    // Requires a custom fetch since it uses FormData, not JSON.
    const token = localStorage.getItem('stacksmith_token')
    return fetch(`${BASE}/api/books/bulk-import`, {
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
    })
  }
}

export const borrowApi = {
  // Members
  memberRequestBook: (data) => post('/api/borrow/request', data),
  cancelMemberRequest: (id) => del(`/api/borrow/${id}/cancel`),
  
  // Staff
  issueBook: (data) => post('/api/borrow/issue', data),
  returnBook: (data) => post('/api/borrow/return', data),
  renewBorrowing: (data) => post('/api/borrow/renew', data),
  
  // Requests
  getPendingRequests: () => get('/api/borrow/pending'),
  confirmIssue: (id, data) => patch(`/api/borrow/${id}/confirm-issue`, data),
  confirmReturn: (id) => patch(`/api/borrow/${id}/confirm-return`)
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
  getMemberFines: (memberId) => get(`/api/fines/member/${memberId}`),
  payFine: (id, amount) => post(`/api/fines/${id}/pay`, { amount }),
  waiveFine: (id) => post(`/api/fines/${id}/waive`)
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
