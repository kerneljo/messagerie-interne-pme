import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, CheckCheck, Paperclip, Pencil, Reply, Trash2,
  MoreHorizontal, Pin, Copy, Smile,
} from 'lucide-react'
import { heureSeule, tailleLisible } from '../utils'
import EffetPoussiere from './EffetPoussiere'

const REACTIONS_RAPIDES = ['👍', '❤️', '😂', '🔥', '😮', '😢']
const LARGEUR_MENU = 208
const MARGE_COTE = 24
const MARGE_HAUT = 16
const MARGE_BAS = 64 // laisse de la place à la barre des tâches

const COULEURS_MOI = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#ffffff', '#dbeafe']
const COULEURS_AUTRE = ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#334155']

/* ============================================================
   Animation d'apparition / fermeture de l'espace après suppression
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
      className={`absolute z-30 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-lg shadow-slate-900/10 ${
        estAuDessus ? '-top-12' : 'top-full mt-2'
      } ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {REACTIONS_RAPIDES.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReagir(emoji, false)}
          className="flex size-8 items-center justify-center rounded-full text-base transition-transform hover:scale-125 hover:bg-slate-100 active:scale-95"
          title={`Réagir ${emoji}`}
        >
          {emoji}
        </button>
      ))}
      <div className="mx-0.5 h-5 w-px bg-slate-200"></div>
      <button
        type="button"
        onClick={() => onReagir(null, true)}
        className="flex size-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        title="Plus d'emojis"
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
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-all hover:scale-105 ${
            r.moi
              ? 'border-blue-300 bg-blue-50 text-blue-700 ring-1 ring-blue-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          title={r.moi ? 'Retirer ma réaction' : `Réagir avec ${r.emoji}`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span className="text-[10px] font-bold leading-none">{r.nb}</span>
        </button>
      ))}
      {masquees > 0 && (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
          +{masquees}
        </span>
      )}
    </div>
  )
}

/* ============================================================
   Menu contextuel flottant (portal, hors du flux : ne déplace rien)
   ============================================================ */
function MenuMessage({ x, y, moi, onRepondre, onModifier, onCopier, onSupprimer, onFermer }) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // Ajuste la position pour rester dans la fenêtre (avant le premier paint)
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    // offsetWidth/offsetHeight ignorent l'animation de zoom
    const largeur = el.offsetWidth
    const hauteur = el.offsetHeight
    const maxLeft = window.innerWidth - largeur - MARGE_COTE
    const maxTop = window.innerHeight - hauteur - MARGE_BAS

    // Pas assez de place en bas : le menu s'ouvre vers le haut
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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
    >
      <div className="py-1">
        <ItemMenu icone={Reply} label="Répondre" onClick={() => { onRepondre(); onFermer() }} />
        {moi && <ItemMenu icone={Pencil} label="Modifier" onClick={() => { onModifier(); onFermer() }} />}
        <ItemMenu icone={Pin} label="Épingler" onClick={onFermer} />
        <ItemMenu icone={Copy} label="Copier le texte" onClick={() => { onCopier(); onFermer() }} />
        {moi && (
          <>
            <div className="my-1 h-px bg-slate-100" />
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
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icone className={`size-4 ${danger ? 'text-red-500' : 'text-slate-400'}`} />
      <span className="font-medium">{label}</span>
    </button>
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

  const [menu, setMenu] = useState(null) // { x, y } ou null
  const [barreVisible, setBarreVisible] = useState(false)
  const [positionBarre, setPositionBarre] = useState('above')
  const [rectPoussiere, setRectPoussiere] = useState(null)

  const bulleRef = useRef(null)
  const bulleVisuelleRef = useRef(null)

  const menuOuvert = menu !== null
  const fermerMenu = useCallback(() => setMenu(null), [])

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
    if (!window.confirm('Supprimer ce message ?')) return
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
      className={`group flex items-end gap-2 ${moi ? 'justify-end' : 'justify-start'}`}
      style={{
        opacity: dissolution ? 0 : 1,
        transition: 'opacity 0.18s ease-out',
        pointerEvents: dissolution ? 'none' : undefined,
      }}
    >
      {/* Bouton ⋯ */}
      <div
        className={`flex shrink-0 items-center transition-opacity duration-150 ${
          menuOuvert ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        } ${moi ? 'order-1' : 'order-2'}`}
      >
        <button
          type="button"
          data-bouton-menu
          onClick={ouvrirMenuDepuisBouton}
          className="flex size-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-700 hover:ring-slate-300"
          aria-label="Options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Wrapper bulle */}
      <div
        ref={bulleRef}
        className={`relative max-w-[75%] md:max-w-[60%] ${moi ? 'order-2' : 'order-1'}`}
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

        {/* Bulle */}
        <div
          ref={bulleVisuelleRef}
          onContextMenu={(e) => {
            e.preventDefault()
            setBarreVisible(false)
            setMenu({ x: e.clientX, y: e.clientY })
          }}
          className={`rounded-2xl px-4 py-2.5 shadow-sm ring-1 transition-shadow hover:shadow-md ${
            moi
              ? 'rounded-br-md bg-blue-600 text-white ring-blue-500/20'
              : 'rounded-bl-md bg-white text-slate-800 ring-slate-200'
          }`}
        >
          {!moi && conversation.type !== 'DIRECT' && (
            <p className="mb-1 text-xs font-semibold text-blue-600">
              {m.expediteur?.prenom} {m.expediteur?.nom}
            </p>
          )}

          {m.reponse_a && (
            <div className={`mb-2 rounded-lg border-l-2 px-2.5 py-1.5 text-xs ${
              moi ? 'border-blue-300 bg-blue-700/40' : 'border-blue-500 bg-slate-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${moi ? 'text-blue-200' : 'text-blue-600'}`}>
                {m.reponse_a.expediteur}
              </p>
              <p className={`mt-0.5 truncate ${moi ? 'text-blue-100' : 'text-slate-600'}`}>
                {m.reponse_a.apercu}
              </p>
            </div>
          )}

          {m.contenu && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.contenu}</p>
          )}

          {m.fichiers.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {m.fichiers.map((f) => (
                <li key={f.reference_fichier}>
                  <a
                    href={`/api/fichiers/${f.reference_fichier}`}
                    download
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                      moi ? 'bg-blue-700/50 hover:bg-blue-700' : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                      moi ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                    }`}>
                      <Paperclip className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.nom_original}</span>
                      <span className={`block text-xs ${moi ? 'text-blue-100' : 'text-slate-500'}`}>
                        {tailleLisible(f.taille)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* Métadonnées (heure + statut) */}
          <div className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] ${
            moi ? 'text-blue-100' : 'text-slate-600'
          }`}>
            <span>{heureSeule(m.date_envoi)}{m.date_modification && ' · modifié'}</span>
            {moi && (
              <span className="flex items-center gap-0.5">
                {m.nb_lecteurs > 0 ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />}
                <span>{statut}</span>
              </span>
            )}
          </div>
        </div>

        {/* Réactions */}
        <ReactionsAffichees
          reactions={m.reactions || []}
          moi={moi}
          onToggle={(emoji) => onReagir?.(m, emoji)}
        />
      </div>

      {/* Menu contextuel : dans un portal, il ne touche pas à la mise en page */}
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
    </div>
  )
}
