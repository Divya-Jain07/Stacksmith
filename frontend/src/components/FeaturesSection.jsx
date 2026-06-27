import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  BarChart3,
  MessageSquare,
  DollarSign,
  Smartphone,
  Shield,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/* ── Section accents ── */
const ACCENT   = '#C4956A'
const COOL     = '#8EA4B8'
const SLATE    = '#2F3E4D'

/* ── Feature data ── */
const FEATURES = [
  {
    id: 'catalog',
    icon: BookOpen,
    color: ACCENT,
    label: 'Smart Catalog',
    tagline: 'Organize every title.',
    description:
      'Full-text catalog management with ISBN lookup, bulk CSV import, copy-level tracking (barcode, condition, status), and an interactive slide-out book drawer.',
    pills: ['ISBN Lookup', 'Bulk Import', 'Copy Tracking', 'Barcode Ready'],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    color: COOL,
    label: 'Real-time Dashboard',
    tagline: 'Pulse of your library.',
    description:
      'Live KPI cards for active borrowings, overdue alerts, fine revenue, and books needing repair. Top-reader rankings and quick-action shortcuts in a single glance.',
    pills: ['Live KPIs', 'Overdue Alerts', 'Fine Revenue', 'Quick Tasks'],
  },
  {
    id: 'chat',
    icon: MessageSquare,
    color: ACCENT,
    label: 'Member Support Chat',
    tagline: 'Help patrons in real time.',
    description:
      'Three-pane chat hub with an unassigned queue, scrollable message history with read receipts, and a member-context sidebar — all powered by WebSockets.',
    pills: ['WebSocket Live', 'Unassigned Queue', 'Member Context', 'Read Ticks'],
  },
  {
    id: 'fines',
    icon: DollarSign,
    color: COOL,
    label: 'Fine Management',
    tagline: 'Close the loop on payments.',
    description:
      'Searchable fine ledger with reason tagging (overdue, damaged, lost). Collect via Cash / UPI / Card modal or waive with reason — role-restricted to Admin.',
    pills: ['Multi-mode Pay', 'Waive (Admin)', 'Fine Ledger', 'Receipt Log'],
  },
  {
    id: 'mobile',
    icon: Smartphone,
    color: ACCENT,
    label: 'Mobile Ready',
    tagline: 'Works on every device.',
    description:
      'Fully responsive layouts for the member kiosk portal — browse the catalog, request holds, track due dates, and chat with staff from any phone or tablet.',
    pills: ['Self-service', 'Responsive UI', 'Hold Requests', 'FIFO Queue'],
  },
  {
    id: 'secure',
    icon: Shield,
    color: COOL,
    label: 'Secure & Scalable',
    tagline: 'Built for multi-branch growth.',
    description:
      'JWT-based RBAC with four roles (SuperAdmin → Member). Multi-tenant architecture supports unlimited branch libraries under one platform instance.',
    pills: ['JWT Auth', 'RBAC (4 roles)', 'Multi-tenant', 'Branch Mgmt'],
  },
]

/* ── Animation variants ── */
const sectionVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const cardVariants = {
  hidden:  { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
}

export default function FeaturesSection() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { isDarkMode } = useTheme()

  return (
    <section
      id="features"
      ref={ref}
      style={{
        background: isDarkMode
          ? 'linear-gradient(180deg, #1f2b36 0%, #2F3E4D 52%, #24313d 100%)'
          : 'var(--bg-base)',
        padding: 'clamp(5rem, 10vh, 8rem) clamp(1rem, 5vw, 2.5rem)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Subtle accent blob — low opacity so it works in both themes */}
      <div style={{
        position: 'absolute', top: '5%', right: '-6%',
        width: 460, height: 460, borderRadius: '50%',
        background: isDarkMode ? SLATE : ACCENT,
        opacity: isDarkMode ? 0.22 : 0.06,
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '0%', left: '-5%',
        width: 340, height: 340, borderRadius: '50%',
        background: isDarkMode ? '#385166' : ACCENT,
        opacity: isDarkMode ? 0.16 : 0.07,
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 6vh, 4.5rem)' }}
        >
          <span style={eyebrowStyle}>Platform Features</span>
          <h2 style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            color: 'var(--text-main)',
            margin: '1rem 0 1.25rem',
          }}>
            Everything a library needs,{' '}
            <span style={goldGradText}>in one system.</span>
          </h2>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            From the counter console to the member kiosk, every workflow is purpose-built.
          </p>
        </motion.div>

        {/* ── 3 × 2 grid ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.25rem',
          }}
        >
          {FEATURES.map(feature => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ── Feature Card with hover-reveal ── */
function FeatureCard({ feature }) {
  const [hovered, setHovered] = useState(false)
  const { isDarkMode } = useTheme()
  const Icon = feature.icon

  return (
    <motion.div
      variants={cardVariants}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'default',
        background: hovered
          ? isDarkMode ? 'rgba(245,237,227,0.075)' : 'rgba(47,62,77,0.06)'
          : isDarkMode ? 'rgba(245,237,227,0.045)' : 'rgba(47,62,77,0.045)',
        border: hovered
          ? `1px solid ${feature.color}55`
          : '1px solid var(--border-color)',
        boxShadow: hovered
          ? `0 16px 40px rgba(0,0,0,0.22), 0 0 0 1px ${feature.color}22`
          : '0 2px 10px rgba(0,0,0,0.10)',
        transition: 'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
        minHeight: '220px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Icon */}
      <motion.div
        animate={{ scale: hovered ? 1.08 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        style={{
          width: 52, height: 52,
          borderRadius: '12px',
          background: `${feature.color}22`,
          border: `1px solid ${feature.color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.1rem',
        }}
      >
        <Icon size={24} color={feature.color} strokeWidth={1.8} />
      </motion.div>

      {/* Label + tagline */}
      <h3 style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--text-main)',
        marginBottom: '0.3rem',
        letterSpacing: '-0.01em',
      }}>
        {feature.label}
      </h3>
      <p style={{
        fontFamily: '"Inter", sans-serif',
        fontSize: '0.8rem',
        fontWeight: 500,
        color: feature.color,
        marginBottom: '0.9rem',
        letterSpacing: '0.02em',
      }}>
        {feature.tagline}
      </p>

      {/* Description — reveals on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.p
            key="desc"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.84rem',
              lineHeight: 1.65,
              color: 'var(--text-muted)',
              marginBottom: '1rem',
              overflow: 'hidden',
            }}
          >
            {feature.description}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Pills */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.55 }}
        transition={{ duration: 0.25 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}
      >
        {feature.pills.map(pill => (
          <span
            key={pill}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.62rem',
              fontWeight: 500,
              letterSpacing: '0.06em',
              padding: '0.22rem 0.55rem',
              borderRadius: '999px',
              background: `${feature.color}18`,
              border: `1px solid ${feature.color}38`,
              color: feature.color,
            }}
          >
            {pill}
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}

/* ── Shared styles ── */
const eyebrowStyle = {
  display: 'inline-block',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: ACCENT,
  background: `${ACCENT}18`,
  border: `1px solid ${ACCENT}44`,
  borderRadius: '999px',
  padding: '0.3rem 0.85rem',
}

const goldGradText = {
  color: ACCENT,   /* plain color avoids the brown-box rendering bug */
}
