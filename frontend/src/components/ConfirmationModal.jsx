import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmationModal({
  ouvert,
  onFermer,
  onConfirmer,
  titre = 'Confirmer l\'action',
  message,
  texteConfirmer = 'Confirmer',
  texteAnnuler = 'Annuler',
  variant = 'danger',
  enCours = false,
}) {
  useEffect(() => {
    if (!ouvert) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !enCours) onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ouvert, enCours, onFermer])

  useEffect(() => {
    if (!ouvert) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = precedent }
  }, [ouvert])

  const styles = {
    danger: {
      icone: 'bg-red-100 text-red-600',
      bouton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    primary: {
      icone: 'bg-indigo-100 text-indigo-600',
      bouton: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
    },
  }[variant]

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[250] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !enCours && onFermer()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-4">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${styles.icone}`}>
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">{titre}</h3>
              </div>
              <button
                type="button"
                onClick={onFermer}
                disabled={enCours}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-600">{message}</p>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onFermer}
                  disabled={enCours}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {texteAnnuler}
                </button>
                <button
                  type="button"
                  onClick={onConfirmer}
                  disabled={enCours}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${styles.bouton}`}
                >
                  {enCours ? '…' : texteConfirmer}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
