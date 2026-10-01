import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Modal de confirmation réutilisable.
 *
 * Exemple d'utilisation :
 *   <ConfirmationModal
 *     ouvert={confirmationOuverte}
 *     onFermer={() => setConfirmationOuverte(false)}
 *     onConfirmer={supprimerMessage}
 *     titre="Supprimer ce message ?"
 *     message="Cette action est irréversible."
 *     texteConfirmer="Supprimer"
 *     variant="danger"
 *   />
 */
export default function ConfirmationModal({
  ouvert,
  onFermer,
  onConfirmer,
  titre = 'Confirmer l’action',
  message,
  texteConfirmer = 'Confirmer',
  texteAnnuler = 'Annuler',
  variant = 'danger', // 'danger' | 'primary'
  enCours = false,
}) {
  // ---- Fermeture avec Échap ----
  useEffect(() => {
    if (!ouvert) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !enCours) onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ouvert, enCours, onFermer])

  // ---- Bloquer le scroll du body quand la modal est ouverte ----
  useEffect(() => {
    if (!ouvert) return
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = precedent
    }
  }, [ouvert])

  if (!ouvert) return null

  // ---- Styles selon la variante ----
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => !enCours && onFermer()}
        aria-hidden="true"
      />

      {/* Carte */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-titre"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h3 id="confirmation-titre" className="text-lg font-semibold text-slate-900">
            {titre}
          </h3>
          <button
            type="button"
            onClick={onFermer}
            disabled={enCours}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${styles.icone}`}
            >
              <AlertTriangle className="size-5" />
            </span>
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
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
      </div>
    </div>
  )
}
