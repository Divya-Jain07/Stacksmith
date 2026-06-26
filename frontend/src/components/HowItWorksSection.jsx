import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  UserPlus,
  Library,
  Rocket,
  BookMarked,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

/* ── Timeline steps ── */
const STEPS = [
  {
    id: 1,
    icon: UserPlus,
    color: 'var(--accent-gold)',
    phase: 'Step 01',
    title: 'Registration',
    headline: 'Create your library account',
    description:
      'A SuperAdmin registers your institution on the platform, provisions a branch library, and assigns the first Admin account. Secure JWT auth from day one.',
    details: ['Create admin account', 'Provision branch', 'Assign roles', 'Set borrow limits'],
    endpoint: 'POST /api/auth/create-admin',
  },
  {
    id: 2,
    icon: Library,
    color: 'var(--color-secondary-light)',
    phase: 'Step 02',
    title: 'Library Setup',
    headline: 'Configure your catalog & staff',
    description:
      'Add librarians, define membership types (Student / Faculty), configure borrow limits and due-date rules, and import your initial book catalog via CSV bulk import.',
    details: ['Add librarians', 'Membership rules', 'Catalog CSV import', 'Set due-date policy'],
    endpoint: 'POST /api/books/bulk-import',
  },
  {
    id: 3,
    icon: Rocket,
    color: 'var(--accent-gold)',
    phase: 'Step 03',
    title: 'Launching',
    headline: 'Go live with your portals',
    description:
      'Staff access the Operational Console for counter ops. Members get the self-service Kiosk Portal to browse, reserve books, and initiate support chats.',
    details: ['Staff console live', 'Kiosk portal ready', 'Real-time chat on', 'Barcode scanning'],
    endpoint: 'GET /api/reports/dashboard',
  },
  {
    id: 4,
    icon: BookMarked,
    color: 'var(--color-secondary-light)',
    phase: 'Step 04',
    title: 'Managing Books',
    headline: 'Issue, return, and track',
    description:
      'Librarians issue and return books via barcode scan at the counter. Members place digital holds from their kiosk. Fines auto-generate on overdue returns.',
    details: ['Barcode issue/return', 'Digital hold requests', 'Auto fine generation', 'Condition tracking'],
    endpoint: 'POST /api/borrow/issue',
  },
  {
    id: 5,
    icon: TrendingUp,
    color: 'var(--accent-gold)',
    phase: 'Step 05',
    title: 'Expanding the Library',
    headline: 'Scale to more branches',
    description:
      'SuperAdmin adds new branch libraries and admins via the Global Analytics Portal. Each branch is isolated yet visible in the aggregate platform metrics.',
    details: ['Register new branches', 'Global analytics', 'Per-branch isolation', 'Revenue tracking'],
    endpoint: 'GET /api/admin/stats',
  },
]

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const goTo  = idx => setActiveStep(Math.max(0, Math.min(STEPS.length - 1, idx)))
  const prev  = () => goTo(activeStep - 1)
  const next  = () => goTo(activeStep + 1)

  const step = STEPS[activeStep]
  const Icon = step.icon

  return (
    <section
      id="how-it-works"
      ref={ref}
      style={{
        background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-base) 100%)',
        padding: 'clamp(5rem, 10vh, 8rem) clamp(1rem, 5vw, 2.5rem)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* BG glow */}
      <div style={{ position:'absolute', bottom:'-10%', left:'15%', width:'600px', height:'400px', borderRadius:'50%', background:'rgba(47,62,77,0.18)', filter:'blur(100px)', pointerEvents:'none' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 6vh, 4rem)' }}
        >
          <span style={eyebrow}>How It Works</span>
          <h2 style={{
            fontFamily: '"Manrope", sans-serif',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-main)',
            margin: '1rem 0 1.25rem',
          }}>
            From setup to scale —{' '}
            <span style={goldGrad}>five simple steps.</span>
          </h2>
          <p style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '1.05rem',
            color: 'var(--text-muted)',
            maxWidth: '500px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Follow the journey from registration to running a multi-branch library operation.
          </p>
        </motion.div>

        {/* ── Progress track ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <StepTrack steps={STEPS} activeStep={activeStep} onSelect={setActiveStep} />
        </motion.div>

        {/* ── Active step card ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{
              marginTop: '2rem',
              background: 'var(--bg-hover)',
              border: `1px solid ${step.color}33`,
              borderRadius: '20px',
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              backdropFilter: 'blur(12px)',
              boxShadow: `0 16px 56px rgba(0,0,0,0.30), 0 0 0 1px ${step.color}18`,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px), 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            {/* Left — main content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '14px',
                  background: `${step.color}22`,
                  border: `1.5px solid ${step.color}55`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={26} color={step.color} strokeWidth={1.7} />
                </div>
                <div>
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.12em',
                    color: step.color,
                    textTransform: 'uppercase',
                  }}>
                    {step.phase}
                  </span>
                  <h3 style={{
                    fontFamily: '"Manrope", sans-serif',
                    fontSize: 'clamp(1.4rem, 2.5vw, 1.9rem)',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em',
                    margin: '2px 0 0',
                  }}>
                    {step.title}
                  </h3>
                </div>
              </div>

              <p style={{
                fontFamily: '"Manrope", sans-serif',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.75rem',
                lineHeight: 1.3,
              }}>
                {step.headline}
              </p>

              <p style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.92rem',
                lineHeight: 1.75,
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
              }}>
                {step.description}
              </p>

            </div>

            {/* Right — checklist */}
            <div>
              <p style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--border-color)',
                marginBottom: '1rem',
              }}>
                What happens in this step
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {step.details.map((d, i) => (
                  <motion.li
                    key={d}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--text-main)',
                    }}
                  >
                    <span style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: `${step.color}22`,
                      border: `1.5px solid ${step.color}55`,
                      color: step.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {d}
                  </motion.li>
                ))}
              </ul>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '2rem' }}>
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStep(i)}
                    aria-label={`Go to step ${i + 1}`}
                    style={{
                      width: i === activeStep ? 24 : 8,
                      height: 8,
                      borderRadius: '999px',
                      background: i === activeStep
                        ? 'linear-gradient(90deg, var(--accent-gold), var(--color-tertiary-light))'
                        : 'var(--border-color)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Prev / Next controls ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
          }}
        >
          <NavBtn onClick={prev} disabled={activeStep === 0} icon={ChevronLeft} label="Previous" />

          <span style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.72rem',
            color: 'var(--border-color)',
            letterSpacing: '0.08em',
          }}>
            {String(activeStep + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>

          <NavBtn onClick={next} disabled={activeStep === STEPS.length - 1} icon={ChevronRight} label="Next" right />
        </motion.div>
      </div>
    </section>
  )
}

/* ── Step progress track (horizontal) ── */
function StepTrack({ steps, activeStep, onSelect }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        scrollbarWidth: 'none',
      }}
    >
      {steps.map((s, i) => {
        const StepIcon = s.icon
        const isActive  = i === activeStep
        const isPast    = i < activeStep

        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {/* Node */}
            <button
              onClick={() => onSelect(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                flexShrink: 0,
              }}
            >
              <motion.div
                animate={{
                  background: isActive
                    ? 'linear-gradient(135deg, var(--accent-gold), var(--color-tertiary-light))'
                    : isPast
                    ? 'rgba(184,134,11,0.30)'
                    : 'rgba(255,255,255,0.06)',
                  borderColor: isActive ? 'var(--color-tertiary-light)' : isPast ? 'var(--accent-gold)55' : 'rgba(255,255,255,0.12)',
                  scale: isActive ? 1.15 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '2px solid',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isActive ? '0 0 16px rgba(184,134,11,0.45)' : 'none',
                }}
              >
                <StepIcon size={18} color={isActive || isPast ? '#fff' : 'var(--border-color)'} strokeWidth={1.8} />
              </motion.div>
              <span style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: '0.68rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent-gold)' : isPast ? 'rgba(245,235,221,0.55)' : 'var(--border-color)',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s ease',
              }}>
                {s.title}
              </span>
            </button>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, position: 'relative', overflow: 'hidden', borderRadius: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 2px', marginBottom: '1.4rem' }}>
                <motion.div
                  animate={{ scaleX: isPast || isActive ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, var(--accent-gold), var(--color-tertiary-light))',
                    transformOrigin: 'left',
                    borderRadius: '1px',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Prev/Next nav button ── */
function NavBtn({ onClick, disabled, icon: Icon, label, right }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.96 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.55rem 1.1rem',
        borderRadius: '8px',
        background: disabled ? 'var(--bg-hover)' : 'rgba(184,134,11,0.12)',
        border: disabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(184,134,11,0.32)',
        color: disabled ? 'var(--border-color)' : 'var(--accent-gold)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: '"Inter", sans-serif',
        fontSize: '0.82rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        transition: 'all 0.2s ease',
        flexDirection: right ? 'row-reverse' : 'row',
      }}
    >
      <Icon size={16} />
      {label}
    </motion.button>
  )
}

/* ── Shared styles ── */
const eyebrow = {
  display: 'inline-block',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--accent-gold)',
  background: 'rgba(184,134,11,0.10)',
  border: '1px solid rgba(184,134,11,0.25)',
  borderRadius: '999px',
  padding: '0.3rem 0.85rem',
}

const goldGrad = {
  background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--color-tertiary-light) 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}
