/**
 * App.jsx — Stacksmith Router Root
 *
 * Route map:
 *   /                → LandingPage        (public)
 *   /login           → LoginPage          (public, redirects away if already authed)
 *   /super-admin/*   → SuperAdminDashboard (SuperAdmin only)
 *   /staff/*         → StaffDashboard      (SuperAdmin · Admin · Librarian)
 *   /member/*        → MemberDashboard     (Member only)
 *   /unauthorized    → UnauthorizedPage    (any authenticated user)
 *   *                → 404 inline
 *
 * AuthProvider must be a child of BrowserRouter so it can call useNavigate().
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider }         from './context/AuthContext'
import { ThemeProvider }        from './context/ThemeContext'
import ProtectedRoute           from './components/auth/ProtectedRoute'
import { ROLES }                from './constants/roles'

import LandingPage              from './components/LandingPage'
import LoginPage                from './pages/LoginPage'
import UnauthorizedPage         from './pages/UnauthorizedPage'
import AdminDashboard           from './pages/dashboards/AdminDashboard'
import LibrarianDashboard       from './pages/dashboards/LibrarianDashboard'
import MemberDashboard          from './pages/dashboards/MemberDashboard'
import SuperAdminDashboard      from './pages/dashboards/SuperAdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      {/*
        AuthProvider sits inside BrowserRouter so it can call
        useNavigate() for post-login redirects.
      */}
      <AuthProvider>
        <ThemeProvider>
          <Routes>
          {/* ── Public ─────────────────────────────────────────── */}
          <Route path="/"      element={<LandingPage />} />
          <Route path="/login" element={<LoginPage   />} />

          {/* ── SuperAdmin Portal ───────────────────────────────── */}
          <Route
            path="/super-admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Admin Portal ─────────────────────────────────────────── */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Librarian Portal ─────────────────────────────────────── */}
          <Route
            path="/librarian/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.LIBRARIAN]}>
                <LibrarianDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Member / Kiosk Portal ───────────────────────────── */}
          <Route
            path="/member/*"
            element={
              <ProtectedRoute allowedRoles={[ROLES.MEMBER]}>
                <MemberDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Error pages ─────────────────────────────────────── */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── 404 catch-all ───────────────────────────────────── */}
          <Route
            path="*"
            element={
              <div style={{
                minHeight: '100svh',
                background: '#0D1117',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                fontFamily: '"Inter", sans-serif',
                textAlign: 'center',
                padding: '2rem',
              }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', letterSpacing: '0.1em', color: '#B8860B', textTransform: 'uppercase' }}>
                  404
                </span>
                <h2 style={{ fontFamily: '"Manrope", sans-serif', fontSize: '2rem', fontWeight: 700, color: '#F5EBDD', margin: 0 }}>
                  Page not found
                </h2>
                <a
                  href="/"
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem 1.4rem',
                    background: 'linear-gradient(135deg, #B8860B, #D4A017)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  Back to home
                </a>
              </div>
            }
          />
        </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
