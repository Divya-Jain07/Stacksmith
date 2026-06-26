/**
 * LandingPage.jsx — Stacksmith Marketing / Landing Page
 *
 * Sections (in order):
 *   1. Navbar          — glassmorphism, fixed, scroll-aware
 *   2. HeroSection     — full-bleed dark hero with CTAs
 *   3. FeaturesSection — 3×2 hover-reveal card grid
 *   4. HowItWorksSection — 5-step progressive carousel
 *   5. ContactSection  — contact form + footer
 *
 * All animation orchestrated with Framer Motion.
 * Design system: #F5EBDD · #2F3E4D · #B8860B · #1A1A1A
 * Fonts: Manrope (headlines) · Inter (body) · JetBrains Mono (labels)
 */

import Navbar            from './Navbar'
import HeroSection       from './HeroSection'
import FeaturesSection   from './FeaturesSection'
import HowItWorksSection from './HowItWorksSection'
import ContactSection    from './ContactSection'

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100svh',
        overflowX: 'hidden',
        background: 'var(--bg-base)',          // darkest base — each section overrides locally
      }}
    >
      {/* ── 1. Navigation ── */}
      <Navbar />

      {/* ── 2. Hero ── */}
      <HeroSection />

      {/* ── 3. Features ── */}
      <FeaturesSection />

      {/* ── 4. How It Works ── */}
      <HowItWorksSection />

      {/* ── 5. Contact + Footer ── */}
      <ContactSection />
    </div>
  )
}
