/**
 * context/AuthContext.jsx — Stacksmith Authentication Provider
 *
 * Responsibilities:
 *  • Persist token + user object in localStorage (survives page refresh)
 *  • Decode the JWT on boot to restore user session without a network call
 *  • Expose login helpers for staff (email/password) and member (memberCode/password)
 *  • Expose logout()
 *  • Provide role-based utility booleans (isStaff, isMember, isSuperAdmin…)
 *  • Expose the raw token for use in Authorization headers (via api.js)
 *
 * JWT payload decoded by backend's generateToken():
 *   { id, name, email, role, adminId, profileId, iat, exp }
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi }     from '../services/api'
import { ROLES, ROLE_ROUTES, DEFAULT_REDIRECT } from '../constants/roles'

/* ── Storage keys ─────────────────────────────────────────────────────────── */
const TOKEN_KEY = 'stacksmith_token'
const USER_KEY  = 'stacksmith_user'

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Manually decode a JWT payload (base64url → JSON).
 * We do NOT verify the signature on the client — that is the server's job.
 * We only read the claims to restore the UI state.
 */
function decodeJWT(token) {
  try {
    const [, payloadB64] = token.split('.')
    // base64url → base64 → UTF-8
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Returns true if the JWT exp timestamp is in the future */
function isTokenValid(decoded) {
  if (!decoded?.exp) return false
  return decoded.exp * 1000 > Date.now()
}

/* ── Context ──────────────────────────────────────────────────────────────── */

const AuthContext = createContext(null)

/* ── Provider ─────────────────────────────────────────────────────────────── */

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  /* ── State ── */
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY) ?? null)
  const [user,    setUser]    = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  /* ── On mount: validate stored token ── */
  useEffect(() => {
    if (!token) return

    const decoded = decodeJWT(token)
    if (!isTokenValid(decoded)) {
      // Token expired — wipe state silently
      clearSession()
    }
  }, []) // run once on mount

  /* ── Persist to localStorage whenever token/user changes ── */
  useEffect(() => {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY,  JSON.stringify(user))
    }
  }, [token, user])

  /* ── Helpers ── */

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  /**
   * After a successful login, store the session and redirect.
   * @param {string} token   - Raw JWT from backend
   * @param {object} userObj - user object from backend response
   */
  const applySession = useCallback((rawToken, userObj) => {
    setToken(rawToken)
    setUser(userObj)
    localStorage.setItem(TOKEN_KEY, rawToken)
    localStorage.setItem(USER_KEY,  JSON.stringify(userObj))

    // Redirect based on role
    const destination = ROLE_ROUTES[userObj.role] ?? DEFAULT_REDIRECT
    navigate(destination, { replace: true })
  }, [navigate])

  /* ── Staff Login (SuperAdmin · Admin · Librarian) ── */
  const loginStaff = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.staffLogin(email, password)
      applySession(data.token, data.user)
      return { success: true }
    } catch (err) {
      const msg = err.message ?? 'Login failed. Please try again.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [applySession])

  /* ── Member Login ── */
  const loginMember = useCallback(async (memberCode, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.memberLogin(memberCode, password)
      applySession(data.token, data.user)
      return { success: true }
    } catch (err) {
      const msg = err.message ?? 'Login failed. Please check your credentials.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [applySession])

  /* ── Logout ── */
  const logout = useCallback(() => {
    // Navigate to the landing page first
    navigate('/', { replace: true })
    // Clear session asynchronously to prevent ProtectedRoute from overriding the navigation
    setTimeout(() => clearSession(), 10)
  }, [navigate])

  /* ── Clear error helper ── */
  const clearError = useCallback(() => setError(null), [])

  /* ── Derived role booleans ── */
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN
  const isAdmin      = user?.role === ROLES.ADMIN
  const isLibrarian  = user?.role === ROLES.LIBRARIAN
  const isMember     = user?.role === ROLES.MEMBER
  const isStaff      = isSuperAdmin || isAdmin || isLibrarian
  const isAuth       = !!token && !!user

  /* ── Memoised context value ── */
  const value = useMemo(() => ({
    // State
    token,
    user,
    loading,
    error,

    // Actions
    loginStaff,
    loginMember,
    logout,
    clearError,

    // Role booleans
    isAuth,
    isSuperAdmin,
    isAdmin,
    isLibrarian,
    isMember,
    isStaff,

    // Raw role string — for ProtectedRoute comparisons
    role: user?.role ?? null,
  }), [
    token, user, loading, error,
    loginStaff, loginMember, logout, clearError,
    isAuth, isSuperAdmin, isAdmin, isLibrarian, isMember, isStaff,
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/* ── Consumer hook ────────────────────────────────────────────────────────── */

/**
 * useAuth() — access the authentication context from any component.
 *
 * @example
 *   const { user, isStaff, logout } = useAuth()
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() must be used within an <AuthProvider>.')
  }
  return ctx
}

export default AuthContext
