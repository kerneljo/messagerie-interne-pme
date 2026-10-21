import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Paperclip, SendHorizontal, Smile, X } from 'lucide-react'
import { tailleLisible } from '../utils'
import EmojiPicker, { LARGEUR_PICKER, HAUTEUR_PICKER } from './EmojiPicker'
import { avecAccuse, minEcheanceLocale, SelecteurCategorie } from './SuiviMessage'

export const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const EXTENSIONS = new Set(TYPES_ACCEPTES.split(',').map((e) => e.slice(1)))
export const MAX_FICHIERS = 5
export const MAX_OCTETS = 10 * 1024 * 1024
export const MAX_CARACTERES = 5000
const HAUTEUR_MAX_TEXTAREA = 200

function extension(nom) {
  return nom.includes('.') ? nom.split('.').pop().toLowerCase() : ''
}

/*
 * Zone de saisie identique à celle de Discussion.
 * Composant contrôlé : le parent garde le texte, les fichiers, le type et l'échéance.
 *
 * Props :
 *  - texte / onTexte, fichiers / onFichiers, categorie / onCategorie, echeance / onEcheance
 *  - onEnvoyer : appelé avec Entrée (Maj + Entrée = retour à la ligne) et avec le bouton d'envoi
 *  - onErreur : reçoit les messages de validation des pièces jointes
 *  - afficherEnvoi : affiche le bouton rond d'envoi (false si le parent a déjà son bouton)
 *  - hauteurMin : hauteur minimale du champ en px
 */
export default function ZoneSaisie({
  texte,
  onTexte,
  fichiers,
  onFichiers,
  categorie,
  onCategorie,
  echeance,
  onEcheance,
  onEnvoyer,
  onErreur,
  onFrappe,
  placeholder = 'Écrivez un message… ',
  ariaLabel = 'Message',
  hauteurMin = 52,
  afficherEnvoi = true,
  peutEnvoyer = true,
  envoiSansContenu = false,
  libelleEnvoi = 'Envoyer',
  envoi = false,
}) {
  const textareaRef = useRef(null)
  const boutonEmojiRef = useRef(null)
  const [survol, setSurvol] = useState(false)
  const [pickerOuvert, setPickerOuvert] = useState(false)
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 })

  // Hauteur automatique du champ
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, HAUTEUR_MAX_TEXTAREA) + 'px'
  }, [texte])

  function ajouter(liste) {
    if (liste.length === 0) return
    const total = [...fichiers, ...liste]
    if (total.length > MAX_FICHIERS) {
      onErreur?.(`${MAX_FICHIERS} fichiers maximum par message.`)
      return
    }
    const interdit = liste.find((f) => !EXTENSIONS.has(extension(f.name)))
    if (interdit) {
      onErreur?.(`Format non accepté : ${interdit.name}`)
      return
    }
    const trop = total.find((f) => f.size > MAX_OCTETS)
    if (trop) {
      onErreur?.(`${trop.name} dépasse 10 Mo.`)
      return
    }
    onErreur?.('')
    onFichiers(total)
  }

  function surChoixFichiers(e) {
    const choisis = Array.from(e.target.files)
    e.target.value = ''
    ajouter(choisis)
  }

  function surDepot(e) {
    e.preventDefault()
    setSurvol(false)
    ajouter(Array.from(e.dataTransfer.files))
  }

  function surColler(e) {
    const colles = Array.from(e.clipboardData?.files ?? [])
    if (colles.length > 0) {
      e.preventDefault()
      ajouter(colles)
    }
  }

  function surTouche(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault()
      onEnvoyer?.()
    }
  }

  function changerCategorie(nouvelle) {
    onCategorie(nouvelle)
    if (!avecAccuse(nouvelle)) onEcheance('')
  }

  function basculerPicker() {
    if (pickerOuvert) {
      setPickerOuvert(false)
      return
    }
    const rect = boutonEmojiRef.current?.getBoundingClientRect()
    if (!rect) return
    let top = rect.top >= HAUTEUR_PICKER + 16 ? rect.top - HAUTEUR_PICKER - 8 : rect.bottom + 8
    top = Math.max(8, Math.min(top, window.innerHeight - HAUTEUR_PICKER - 8))
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - LARGEUR_PICKER - 8))
    setPickerCoords({ top, left })
    setPickerOuvert(true)
  }

  function insererEmoji(emoji) {
    const el = textareaRef.current
    const debut = el?.selectionStart ?? texte.length
    const fin = el?.selectionEnd ?? texte.length
    const nouveau = texte.slice(0, debut) + emoji + texte.slice(fin)
    if (nouveau.length > MAX_CARACTERES) return
    onTexte(nouveau)
    onFrappe?.()
    requestAnimationFrame(() => {
      el?.focus()
      const position = debut + emoji.length
      el?.setSelectionRange(position, position)
    })
  }

  const actif =
    peutEnvoyer && !envoi && (envoiSansContenu || texte.trim() !== '' || fichiers.length > 0)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setSurvol(true)
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={surDepot}
      className={`rounded-3xl border bg-white/90 shadow-lg shadow-lagon-950/5 backdrop-blur-xl transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/15 ${
        survol ? 'border-indigo-400 ring-4 ring-indigo-500/15' : 'border-slate-200'
      }`}
    >
      {/* Message qui engage : accusé demandé et échéance facultative */}
      {avecAccuse(categorie) && (
        <div
          className={`mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2 text-xs ${
            categorie === 'URGENT' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'
          }`}
        >
          <span className="min-w-0 flex-1">Les destinataires devront accuser réception de ce message.</span>
          <label className="flex items-center gap-2">
            <span className="font-medium">Échéance</span>
            <input
              type="datetime-local"
              value={echeance}
              min={minEcheanceLocale()}
              onChange={(e) => onEcheance(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          {echeance && (
            <button
              type="button"
              onClick={() => onEcheance('')}
              className="font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Retirer
            </button>
          )}
        </div>
      )}

      {fichiers.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-4 pt-3">
          {fichiers.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <button
                type="button"
                onClick={() => onFichiers(fichiers.filter((_, j) => j !== i))}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                aria-label={`Retirer ${f.name}`}
              >
                <Paperclip className="size-3.5" />
                <span className="max-w-[180px] truncate">{f.name}</span>
                <span className="text-slate-500">({tailleLisible(f.size)})</span>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={textareaRef}
        value={texte}
        onChange={(e) => {
          onTexte(e.target.value)
          onFrappe?.()
        }}
        onKeyDown={surTouche}
        onPaste={surColler}
        placeholder={placeholder}
        aria-label={ariaLabel}
        readOnly={envoi}
        rows={1}
        maxLength={MAX_CARACTERES}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        style={{ minHeight: hauteurMin }}
        className="defilement-fin block max-h-[200px] w-full resize-none overflow-y-auto bg-transparent px-5 pb-1 pt-4 text-[15px] leading-6 text-slate-900 caret-action-600 placeholder-slate-500 focus:outline-none"
      />

      <div className="flex items-center gap-1 px-3 pb-3 pt-1">
        <label
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          title="Joindre un fichier"
        >
          <Paperclip className="size-[18px]" />
          <span className="sr-only">Joindre un fichier</span>
          <input type="file" multiple accept={TYPES_ACCEPTES} onChange={surChoixFichiers} hidden />
        </label>

        <button
          ref={boutonEmojiRef}
          type="button"
          onClick={basculerPicker}
          aria-expanded={pickerOuvert}
          title="Emojis"
          aria-label="Ouvrir le sélecteur d'emojis"
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${
            pickerOuvert ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Smile className="size-[18px]" />
        </button>

        <SelecteurCategorie categorie={categorie} onChange={changerCategorie} />

        <span className="flex-1" />

        {texte.length > MAX_CARACTERES * 0.9 && (
          <span className="text-xs font-medium text-amber-700" aria-live="polite">
            {texte.length} / {MAX_CARACTERES}
          </span>
        )}

        {afficherEnvoi && (
          <motion.button
            type="button"
            onClick={onEnvoyer}
            disabled={!actif}
            animate={{ scale: actif ? 1 : 0.9 }}
            whileTap={actif ? { scale: 0.88 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            title={libelleEnvoi}
            aria-label={libelleEnvoi}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-600 text-white shadow-sm transition-colors hover:bg-action-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {envoi ? (
              <span
                className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                role="status"
                aria-label="Envoi en cours"
              />
            ) : (
              <SendHorizontal className="size-[18px]" />
            )}
          </motion.button>
        )}
      </div>

      {pickerOuvert &&
        createPortal(
          <div
            className="fixed inset-0 z-[100]"
            data-ignorer-clic-exterieur
            onClick={() => setPickerOuvert(false)}
          >
            <div
              className="absolute"
              style={{ top: pickerCoords.top, left: pickerCoords.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker onSelection={insererEmoji} onFermer={() => setPickerOuvert(false)} />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
