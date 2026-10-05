import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, CheckCheck, Pencil, Reply, Trash2,
  MoreHorizontal, Pin, Copy, Smile,
} from 'lucide-react'
import { heureSeule } from '../utils'
import EffetPoussiere from './EffetPoussiere'
import ApercuImages from './ApercuImages'
import ConfirmationModal from './ConfirmationModal'

const REACTIONS_RAPIDES = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const LARGEUR_MENU = 208
const MARGE_COTE = 24
const MARGE_HAUT = 16
const MARGE_BAS = 64

/* ============================================================
   Couleurs de la poussière (reprennent celles des bulles)
   Bulle envoyée : blue-600 #2563eb / Bulle reçue : blanc + contour slate
   ============================================================ */
const COULEURS_MOI = [
  '#2563eb', '#2563eb', '#2563eb',
  '#3b82f6', '#3b82f6',
  '#60a5fa',
  '#bfdbfe',
  '#ffffff',
]
const COULEURS_AUTRE = [
  '#f1f5f9', '#e2e8f0', '#e2e8f0',
  '#cbd5e1', '#cbd5e1',
  '#94a3b8',
  '#64748b',
]

/* ============================================================
   Animation d'apparition / fermeture
   ============================================================ */
export function BulleAnimee({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'visible' }}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   Barre de réactions rapides
   ============================================================ */
function BarreReactions({ onReagir, position = 'above', align = 'right' }) {
  const estAuDessus = position === 'above'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: estAuDessus ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: estAuDessus ? 4 : -4 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className={`absolute z-30 flex items-center gap-0.5 rounded-full border border-slate-300 bg-white px-1.5 py-1 shadow-lg shadow-slate-900/10 ${
        estAuDessus ? '-top-12' : 'top-full mt-2'
      } ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {REACTIONS_RAPIDES.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReagir(emoji, false)}
          className="flex size-8 items-center justify-center rounded-full text-base transition-transform hover:scale-125 hover:bg-slate-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-700"
          title={`Réagir ${emoji}`}
          aria-label={`Réagir avec ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="mx-0.5 h-5 w-px bg-slate-300" aria-hidden="true"></div>
      <button
        type="button"
        onClick={() => onReagir(null, true)}
        className="flex size-8 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
        title="Plus d'emojis"
        aria-label="Plus d'emojis"
      >
        <Smile className="size-4" />
      </button>
    </motion.div>
  )
}

/* ============================================================
   Réactions collées à la bulle
   ============================================================ */
function ReactionsAffichees({ reactions, moi, onToggle }) {
  if (!reactions || reactions.length === 0) return null

  const visible = reactions.slice(0, 3)
  const masquees = reactions.length - visible.length

  return (
    <div className={`relative z-10 -mt-2 flex flex-wrap gap-1 ${moi ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
      {visible.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle?.(r.emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-all hover:scale-105 focus-visible:outline-2 focus-visible:outline-blue-700 ${
            r.moi
              ? 'border-blue-400 bg-blue-50 text-blue-800 ring-1 ring-blue-100'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
          }`}
          title={r.moi ? 'Retirer ma réaction' : `Réagir avec ${r.emoji}`}
          aria-label={`${r.emoji} ${r.nb}${r.moi ? ', retirer ma réaction' : ''}`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="text-[11px] font-bold leading-none">{r.nb}</span>
        </button>
      ))}
      {masquees > 0 && (
        <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
          +{masquees}
        </span>
      )}
    </div>
  )
}

/* ============================================================
   Menu contextuel
   ============================================================ */
function MenuMessage({ x, y, moi, onRepondre, onModifier, onCopier, onSupprimer, onFermer }) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const largeur = el.offsetWidth
    const hauteur = el.offsetHeight
    const maxLeft = window.innerWidth - largeur - MARGE_COTE
    const maxTop = window.innerHeight - hauteur - MARGE_BAS

    let top = y
    if (y > maxTop) top = y - hauteur - 6

    setPos({
      left: Math.max(MARGE_COTE, Math.min(x, maxLeft)),
      top: Math.max(MARGE_HAUT, Math.min(top, maxTop)),
    })
  }, [x, y])

  useEffect(() => {
    function surMouseDown(e) {
      if (menuRef.current?.contains(e.target)) return
      if (e.target.closest?.('[data-bouton-menu]')) return
      onFermer()
    }
    function surTouche(e) {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('mousedown', surMouseDown)
    document.addEventListener('keydown', surTouche)
    window.addEventListener('resize', onFermer)
    window.addEventListener('scroll', onFermer, true)
    return () => {
      document.removeEventListener('mousedown', surMouseDown)
      document.removeEventListener('keydown', surTouche)
      window.removeEventListener('resize', onFermer)
      window.removeEventListener('scroll', onFermer, true)
    }
  }, [onFermer])

  return createPortal(
    <motion.div
      ref={menuRef}
      role="menu"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: LARGEUR_MENU,
        zIndex: 150,
        transformOrigin: 'top left',
      }}
      className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl shadow-slate-900/20"
    >
      <div className="py-1">
        <ItemMenu icone={Reply} label="Répondre" onClick={() => { onRepondre(); onFermer() }} />
        {moi && <ItemMenu icone={Pencil} label="Modifier" onClick={() => { onModifier(); onFermer() }} />}
        <ItemMenu icone={Pin} label="Épingler" onClick={onFermer} />
        <ItemMenu icone={Copy} label="Copier le texte" onClick={() => { onCopier(); onFermer() }} />
        {moi && (
          <>
            <div className="my-1 h-px bg-slate-200" role="separator" />
            <ItemMenu icone={Trash2} label="Supprimer" onClick={() => { onFermer(); onSupprimer() }} danger />
          </>
        )}
      </div>
    </motion.div>,
    document.body
  )
}

function ItemMenu({ icone: Icone, label, onClick, danger }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 ${
        danger ? 'text-red-700 hover:bg-red-50' : 'text-slate-800 hover:bg-slate-100'
      }`}
    >
      <Icone className={`size-4 ${danger ? 'text-red-600' : 'text-slate-600'}`} />
      <span className="font-medium">{label}</span>
    </button>
  )
}

/* ============================================================
   Heure + statut, affichés sous la bulle
   ============================================================ */
function MetaMessage({ m, moi, statut }) {
  const lu = m.nb_lecteurs > 0

  return (
    // w-0 + min-w-full : la ligne prend la largeur de la bulle sans jamais l'élargir
    <div
      className={`mt-1 flex w-0 min-w-full items-center gap-1.5 whitespace-nowrap px-1 text-[11px] text-slate-600 ${
        moi ? 'justify-end' : 'justify-start'
      }`}
    >
      <span>{heureSeule(m.date_envoi)}{m.date_modification && ' · modifié'}</span>
      {moi && (
        <span className="flex items-center gap-0.5">
          {lu
            ? <CheckCheck className="size-3.5 text-blue-700" aria-hidden="true" />
            : <Check className="size-3.5" aria-hidden="true" />}
          <span>{statut}</span>
        </span>
      )}
    </div>
  )
}

/* ============================================================
   Bulle d'un message
   ============================================================ */
export default function Bulle({ m, moi, conversation, onRepondre, onModifier, onSupprimer, onReagir, onOuvrirEmoji }) {
  const autres = conversation.participants.length - 1
  const statut =
    m.nb_lecteurs === 0
      ? 'Envoyé'
      : conversation.type === 'DIRECT'
        ? 'Lu'
        : `Lu par ${m.nb_lecteurs}/${autres}`

  const [menu, setMenu] = useState(null)
  const [barreVisible, setBarreVisible] = useState(false)
  const [positionBarre, setPositionBarre] = useState('above')
  const [rectPoussiere, setRectPoussiere] = useState(null)
  const [confirmation, setConfirmation] = useState(false)

  const bulleRef = useRef(null)
  const bulleVisuelleRef = useRef(null)

  const menuOuvert = menu !== null
  const fermerMenu = useCallback(() => setMenu(null), [])

  // Largeur adaptative selon le contenu
  const estLongTexte = m.contenu && m.contenu.length > 200
  const contientFichier = m.fichiers && m.fichiers.length > 0
  const largeurMax = estLongTexte
    ? 'md:max-w-[50%]'
    : contientFichier
      ? 'md:max-w-[65%]'
      : 'md:max-w-[55%]'

  function surSurvol() {
    if (bulleRef.current) {
      const rect = bulleRef.current.getBoundingClientRect()
      setPositionBarre(rect.top >= 380 ? 'above' : 'below')
    }
    setBarreVisible(true)
  }

  function ouvrirMenuDepuisBouton(e) {
    if (menuOuvert) return fermerMenu()
    const rect = e.currentTarget.getBoundingClientRect()
    setBarreVisible(false)
    setMenu({
      x: moi ? rect.right - LARGEUR_MENU : rect.left,
      y: rect.bottom + 6,
    })
  }

  function copier() {
    if (m.contenu) navigator.clipboard?.writeText(m.contenu)
  }

  function demanderSuppression() {
    setConfirmation(true)
  }

  function confirmerSuppression() {
    setConfirmation(false)
    const el = bulleVisuelleRef.current
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!el || reduit) {
      onSupprimer(m)
      return
    }
    setBarreVisible(false)
    setRectPoussiere(el.getBoundingClientRect())
  }

  const dissolution = rectPoussiere !== null

  return (
    <div
      className={`group flex items-start gap-2 ${moi ? 'justify-end' : 'justify-start'}`}
      style={{
        opacity: dissolution ? 0 : 1,
        transition: 'opacity 0.18s ease-out',
        pointerEvents: dissolution ? 'none' : undefined,
      }}
    >
      {/* Bouton ⋯ : visible au survol ET au focus clavier */}
      <div
        className={`flex shrink-0 items-center self-center transition-opacity duration-150 ${
          menuOuvert ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        } ${moi ? 'order-1' : 'order-2'}`}
      >
        <button
          type="button"
          data-bouton-menu
          onClick={ouvrirMenuDepuisBouton}
          className="flex size-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-300 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
          aria-label="Options du message"
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Wrapper bulle + réactions + heure */}
      <div
        ref={bulleRef}
        className={`relative max-w-[85%] ${largeurMax} ${moi ? 'order-2' : 'order-1'}`}
        onMouseEnter={surSurvol}
        onMouseLeave={() => setBarreVisible(false)}
      >
        {/* Barre de réactions rapides */}
        <AnimatePresence>
          {barreVisible && !menuOuvert && !dissolution && (
            <BarreReactions
              onReagir={(emoji, ouvrirPicker) => {
                if (ouvrirPicker) {
                  const rect = bulleRef.current?.getBoundingClientRect()
                  onOuvrirEmoji?.(m, rect)
                } else {
                  onReagir?.(m, emoji)
                }
                setBarreVisible(false)
              }}
              position={positionBarre}
              align={moi ? 'right' : 'left'}
            />
          )}
        </AnimatePresence>

        {/* Bulle visuelle : uniquement le contenu */}
        <div
          ref={bulleVisuelleRef}
          onContextMenu={(e) => {
            e.preventDefault()
            setBarreVisible(false)
            setMenu({ x: e.clientX, y: e.clientY })
          }}
          className={`rounded-2xl px-4 py-2.5 shadow-sm ring-1 transition-shadow hover:shadow-md ${
            moi
              ? 'rounded-br-md bg-blue-600 text-white ring-blue-700/30'
              : 'rounded-bl-md bg-white text-slate-900 ring-slate-300'
          }`}
        >
          {!moi && conversation.type !== 'DIRECT' && (
            <p className="mb-1 text-xs font-semibold text-blue-700">
              {m.expediteur?.prenom} {m.expediteur?.nom}
            </p>
          )}

          {m.reponse_a && (
            <div className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${
              moi ? 'border-white/70 bg-blue-900/40' : 'border-blue-600 bg-slate-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${moi ? 'text-blue-100' : 'text-blue-700'}`}>
                {m.reponse_a.expediteur}
              </p>
              <p className={`mt-0.5 truncate ${moi ? 'text-blue-50' : 'text-slate-700'}`}>
                {m.reponse_a.apercu}
              </p>
            </div>
          )}

          {m.contenu && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.contenu}</p>
          )}

          {m.fichiers && m.fichiers.length > 0 && (
            <ApercuImages fichiers={m.fichiers} moi={moi} />
          )}
        </div>

        {/* Réactions (chevauchent légèrement le bas de la bulle) */}
        <ReactionsAffichees
          reactions={m.reactions || []}
          moi={moi}
          onToggle={(emoji) => onReagir?.(m, emoji)}
        />

        {/* Heure + statut : en dehors de la bulle */}
        <MetaMessage m={m} moi={moi} statut={statut} />
      </div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {menu && (
          <MenuMessage
            key="menu"
            x={menu.x}
            y={menu.y}
            moi={moi}
            onRepondre={() => onRepondre(m)}
            onModifier={() => onModifier(m)}
            onCopier={copier}
            onSupprimer={demanderSuppression}
            onFermer={fermerMenu}
          />
        )}
      </AnimatePresence>

      {/* Effet de désintégration */}
      {rectPoussiere && (
        <EffetPoussiere
          rect={rectPoussiere}
          couleurs={moi ? COULEURS_MOI : COULEURS_AUTRE}
          onFin={() => onSupprimer(m)}
        />
      )}

      {/* Modal de confirmation */}
      <ConfirmationModal
        ouvert={confirmation}
        onFermer={() => setConfirmation(false)}
        onConfirmer={confirmerSuppression}
        titre="Supprimer ce message ?"
        message="Ce message sera définitivement supprimé pour tous les participants. Cette action est irréversible."
        texteConfirmer="Supprimer"
        texteAnnuler="Annuler"
        variant="danger"
      />
    </div>
  )
}
