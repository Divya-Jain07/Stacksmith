/**
 * constants/roles.js — Stacksmith Role Constants
 *
 * Single source of truth for all role strings.
 * Mirror of backend src/constants.js  +  SuperAdmin which the
 * backend auth middleware handles separately.
 */

export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  ADMIN:       'Admin',
  LIBRARIAN:   'Librarian',
  MEMBER:      'Member',
}

/** Staff roles — Admin or Librarian (or SuperAdmin) */
export const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN]

/** Route destinations per role */
export const ROLE_ROUTES = {
  [ROLES.SUPER_ADMIN]: '/super-admin',
  [ROLES.ADMIN]:       '/admin',
  [ROLES.LIBRARIAN]:   '/librarian',
  [ROLES.MEMBER]:      '/member',
}

/** Default redirect when role is unknown */
export const DEFAULT_REDIRECT = '/'
