import { motion, AnimatePresence } from 'framer-motion'
import { X, SendHorizontal, Paperclip, CornerUpLeft, Pencil } from 'lucide-react'

export default function ModalApercu({
  destinataire,
  texte,
  fichiers,
  reponseA,
  edition,
  onFermer,
  onConfirmer,
}) {
  const apercu = texte.trim().slice(0, 200)
  const nbFichiers = fichiers?.length || 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onFermer} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <SendHorizontal className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900">
                {edition ? 'Confirmer la modification' : 'Confirmer l\'envoi'}
              </h3>
              <p className="text-xs text-slate-500">
                À : <span className="font-medium text-slate-700">{destinataire}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
            {reponseA && (
              <div className="flex items-start gap-2 rounded-lg border-l-4 border-blue-500 bg-slate-100 px-3 py-2 text-xs">
                <CornerUpLeft className="size-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">
                    En réponse à {reponseA.expediteur?.prenom}
                  </p>
                  <p className="truncate text-slate-500 mt-0.5">
                    {reponseA.contenu || 'Pièce jointe'}
                  </p>
                </div>
              </div>
            )}

            {apercu && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                  {apercu}
                  {texte.length > 200 && (
                    <span className="text-slate-400"> … (+{texte.length - 200} car.)</span>
                  )}
                </p>
              </div>
            )}

            {nbFichiers > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {nbFichiers} pièce{nbFichiers > 1 ? 's' : ''} jointe{nbFichiers > 1 ? 's' : ''}
                </p>
                <ul className="space-y-1.5">
                  {fichiers.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <Paperclip className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-xs text-slate-700">{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!apercu && nbFichiers === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Rien à envoyer.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirmer}
              disabled={!apercu && nbFichiers === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {edition ? <Pencil className="size-4" /> : <SendHorizontal className="size-4" />}
              {edition ? 'Enregistrer' : 'Envoyer'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
