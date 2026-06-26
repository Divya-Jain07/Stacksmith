/**
 * theme.js — Stacksmith Design Tokens (JavaScript)
 *
 * Single source of truth for brand values that need to be used
 * programmatically (e.g. in Framer Motion variants, Chart.js configs,
 * canvas drawing, or dynamic inline styles).
 *
 * All values mirror the CSS custom properties declared in index.css.
 */

// ── Colors ────────────────────────────────────────────────
export const colors = {
  primary:       '#F5EBDD',
  primaryLight:  '#FAF4EC',
  primaryDark:   '#E8D8C0',

  secondary:       '#2F3E4D',
  secondaryLight:  '#3D5166',
  secondaryDark:   '#1E2B37',

  tertiary:       '#B8860B',
  tertiaryLight:  '#D4A017',
  tertiaryDark:   '#8B6508',

  neutral:     '#1A1A1A',
  neutral50:   '#F7F7F7',
  neutral100:  '#EFEFEF',
  neutral200:  '#D9D9D9',
  neutral300:  '#BFBFBF',
  neutral400:  '#A0A0A0',
  neutral500:  '#808080',
  neutral600:  '#606060',
  neutral700:  '#404040',
  neutral800:  '#2A2A2A',
  neutral900:  '#1A1A1A',

  surface:        '#FFFFFF',
  surfaceRaised:  '#F5EBDD',

  textPrimary:   '#1A1A1A',
  textSecondary: '#2F3E4D',
  textMuted:     '#6B7280',
  textInverted:  '#F5EBDD',

  success: '#2E7D32',
  warning: '#B8860B',
  error:   '#C62828',
  info:    '#1565C0',
}

// ── Typography ────────────────────────────────────────────
export const fonts = {
  heading: '"Manrope", ui-sans-serif, system-ui, sans-serif',
  body:    '"Inter",   ui-sans-serif, system-ui, sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, Consolas, monospace',
}

export const fontSizes = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
  '7xl': '4.5rem',
}

// ── Spacing / Radius ──────────────────────────────────────
export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  '2xl': '24px',
  full: '9999px',
}

// ── Shadows ───────────────────────────────────────────────
export const shadows = {
  sm:   '0 1px 3px rgba(26, 26, 26, 0.08), 0 1px 2px rgba(26, 26, 26, 0.04)',
  md:   '0 4px 12px rgba(26, 26, 26, 0.10), 0 2px 4px rgba(26, 26, 26, 0.06)',
  lg:   '0 10px 30px rgba(26, 26, 26, 0.12), 0 4px 8px rgba(26, 26, 26, 0.08)',
  xl:   '0 20px 60px rgba(26, 26, 26, 0.15), 0 8px 16px rgba(26, 26, 26, 0.10)',
  gold: '0 4px 20px rgba(184, 134, 11, 0.30)',
}

// ── Animation / Easing ────────────────────────────────────
export const durations = {
  fast:   0.15,   // seconds
  normal: 0.25,
  slow:   0.40,
}

export const easings = {
  spring: [0.34, 1.56, 0.64, 1],   // cubic-bezier — use with Framer Motion type:"tween"
  smooth: [0.4,  0,    0.2,  1],
}

/** Pre-built Framer Motion transition presets */
export const transitions = {
  fast: {
    type: 'tween',
    duration: durations.fast,
    ease: easings.smooth,
  },
  normal: {
    type: 'tween',
    duration: durations.normal,
    ease: easings.smooth,
  },
  spring: {
    type: 'spring',
    stiffness: 260,
    damping: 20,
  },
  springGentle: {
    type: 'spring',
    stiffness: 120,
    damping: 18,
  },
}

/** Framer Motion fade-up variant factory */
export const fadeUpVariants = (delaySeconds = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...transitions.normal, delay: delaySeconds },
  },
})

/** Framer Motion stagger container variant */
export const staggerContainer = (staggerChildren = 0.1, delayChildren = 0) => ({
  hidden:  {},
  visible: { transition: { staggerChildren, delayChildren } },
})

// Default export as a single config object (useful for chart libraries etc.)
const theme = {
  colors,
  fonts,
  fontSizes,
  radius,
  shadows,
  durations,
  easings,
  transitions,
  fadeUpVariants,
  staggerContainer,
}

export default theme
