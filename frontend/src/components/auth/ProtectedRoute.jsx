/**
 * components/auth/ProtectedRoute.jsx
 *
 * A wrapper that guards React Router routes based on:
 *  1. Authentication — redirects to /login if not logged in
 *  2. Role — redirects to /unauthorized if the user's role isn't in allowedRoles
 *
 * Usage:
 *   <Route
 *     path="/staff/*"
 *     element={
 *       <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.SUPER_ADMIN]}>
 *         <StaffPortal />
 *       </ProtectedRoute>
 *     }
 *   />
 *
 * Props:
 *   children      ReactNode  — the component to render when access is granted
 *   allowedRoles  string[]   — array of ROLES values permitted to view this route
 *   redirectPath  string     — optional custom redirect for unauthenticated users (default: /login)
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectPath = '/login',
}) {
  const { isAuth, role } = useAuth()
  const location = useLocation()

  /* 1 — Not logged in → send to login, preserving the intended destination */
  if (!isAuth) {
    return (
      <Navigate
        to={redirectPath}
        state={{ from: location }}
        replace
      />
    )
  }

  /* 2 — Logged in but wrong role → send to /unauthorized */
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  /* 3 — All checks passed */
  return children
}
