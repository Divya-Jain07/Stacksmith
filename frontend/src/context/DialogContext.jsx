import { useState, useCallback, useEffect, createContext, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

const DialogContext = createContext()

export function useDialog() {
  return useContext(DialogContext)
}

export function DialogProvider({ children }) {
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => setNotification(null), 4000)
    return () => clearTimeout(timer)
  }, [notification])

  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type })
  }, [])

  const dismissNotification = useCallback(() => setNotification(null), [])

  const confirm = useCallback((message, title) => {
    return new Promise((resolve) => {
      setConfirmDialog({ message, title: title || 'Confirm', resolve })
    })
  }, [])

  const handleConfirm = (result) => {
    confirmDialog?.resolve(result)
    setConfirmDialog(null)
  }

  const iconMap = {
    success: <CheckCircle size={20} color="#66BB6A" />,
    error: <XCircle size={20} color="#EF5350" />,
    warning: <AlertTriangle size={20} color="#FFB300" />,
    info: <Info size={20} color="var(--accent-gold)" />,
  }

  const borderMap = {
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFB300',
    info: 'var(--accent-gold)',
  }

  return (
    <DialogContext.Provider value={{ notify, confirm }}>
      {children}

      {/* ── Notification Toast ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: '1.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              background: 'var(--bg-surface)',
              border: `1px solid ${borderMap[notification.type] || borderMap.info}`,
              borderRadius: '12px',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              maxWidth: '500px',
              width: '90%',
            }}
          >
            {iconMap[notification.type] || iconMap.info}
            <span style={{ flex: 1, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.4' }}>
              {notification.message}
            </span>
            <button
              onClick={dismissNotification}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Confirm Dialog ── */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                padding: '2rem',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '400px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', margin: 0 }}>{confirmDialog.title}</h3>
                <button onClick={() => handleConfirm(false)} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleConfirm(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--accent-gold)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  )
}
