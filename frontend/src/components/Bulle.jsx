import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Check, CheckCheck, Copy, MoreHorizontal, Pencil, Reply, Smile, Trash2,
} from 'lucide-react'
import { heureSeule } from '../utils'
import EffetPoussiere from './EffetPoussiere'
import ApercuImages from './ApercuImages'
import ConfirmationModal from './ConfirmationModal'

/* Réactions rapides : un jeu sobre, adapté au contexte professionnel */
const REACTIONS_RAPIDES = ['👍', '✅', '🙏', '👀', '👏', '💡']
const LARGEUR_MENU = 208
const MARGE_COTE = 24
const MARGE_HAUT = 16
const MARGE_BAS = 64
// Sous cette distance du haut de l'écran (en-têtes compris), la barre d'actions s'affiche sous la bulle
const ESPACE_MIN_AU_DESSUS = 150
const DUREE_RETOUR_COPIE = 1600

/* Message composé uniquement de 1 à 3 emojis : affiché en grand, sans bulle */
const RE_EMOJI_SEUL = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D|\p{Emoji_Modifier})*){1,3}$/u

/* ============================================================
   Palette des bulles (suit le thème de index.css)
   Envoyé : blue-100  (clair : #dbe4ff / sombre : #1a2552)
   Reçu   : papier    (clair : blanc   / sombre : #121827)
   ============================================================ */
const STYLE_BULLE_MOI = 'bg-blue-200 text-slate-900 ring-1 ring-blue-300'
const STYLE_BULLE_AUTRE = 'bg-papier text-slate-800 ring-1 ring-slate-200'

/* Anneau de focus unique pour tous les éléments interactifs */
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-[#E95420]'

/* Cibles tactiles : 32 px à la souris, 40 px au doigt */
const CIBLE = 'size-8 [@media(pointer:coarse)]:size-10'

/* Couleurs de la poussière : lues dans les variables du thème au moment de l'effet */
function lireVariable(nom, secours) {
  if (typeof document === 'undefined') return secours
  const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim()
  return v || secours
}

function couleursPoussiere(moi) {
  if (moi) {
    const base = lireVariable('--color-blue-100', '#dbe4ff')
    const liseré = lireVariable('--color-blue-200', '#bac8ff')
    const accent = lireVariable('--color-blue-300', '#91a7ff')
    return [base, base, base, liseré, liseré, accent]
  }
  const papier = lireVariable('--color-papier', '#ffffff')
  const s100 = lireVariable('--color-slate-100', '#f1f5f9')
  const s200 = lireVariable('--color-slate-200', '#e2e8f0')
  const s300 = lireVariable('--color-slate-300', '#cbd5e1')
  return [papier, papier, papier, s100, s100, s200, s300]
}

/* ============================================================
   Animation d'apparition / fermeture
   Réduite à un simple fondu si l'utilisateur demande moins d'animations.
   ============================================================ */
export function BulleAnimee({ children }) {
  const reduit = useReducedMotion()

  return (
    <motion.div
      initial={reduit ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        transition: { duration: reduit ? 0.01 : 0.32, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{ duration: reduit ? 0.01 : 0.3, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'visible' }}
    >
      {children}
    </motion.div>
  )
}

/* ============================================================
   Barre d'actions au survol : réactions rapides, plus d'emojis et menu « ⋯ »
   ============================================================ */
function BarreActions({ onReagir, onPlusEmojis, onMenu, menuOuvert, position, align, dejaReagi }) {
  const estAuDessus = position === 'above'

  return (
    <motion.div
      role="toolbar"
      aria-label="Actions du message"
      initial={{ opacity: 0, scale: 0.92, y: estAuDessus ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: estAuDessus ? 4 : -4 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className={`absolute z-30 flex items-center gap-0.5 rounded-full border border-slate-200 bg-papier px-1.5 py-1 shadow-lg shadow-black/10 ${
        estAuDessus ? '-top-11' : 'top-full mt-1'
      } ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {REACTIONS_RAPIDES.map((emoji) => {
        const actif = dejaReagi.has(emoji)
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReagir(emoji)}
            aria-pressed={actif}
            className={`flex ${CIBLE} items-center justify-center rounded-full text-base transition-transform hover:scale-125 active:scale-95 ${FOCUS} ${
              actif ? 'bg-blue-100' : 'hover:bg-slate-100'
            }`}
            title={actif ? `Retirer ${emoji}` : `Réagir ${emoji}`}
            aria-label={actif ? `Retirer ma réaction ${emoji}` : `Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        )
      })}

      <div className="mx-0.5 h-5 w-px bg-slate-200" aria-hidden="true" />

      <button
        type="button"
        onClick={onPlusEmojis}
        className={`flex ${CIBLE} items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${FOCUS}`}
        title="Plus d'emojis"
        aria-label="Plus d'emojis"
      >
        <Smile className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        data-bouton-menu
        onClick={onMenu}
        className={`flex ${CIBLE} items-center justify-center rounded-full transition ${FOCUS} ${
          menuOuvert ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        title="Plus d'actions"
        aria-label="Options du message"
        aria-haspopup="menu"
        aria-expanded={menuOuvert}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

/* ============================================================
   Réactions : pastilles qui chevauchent le bas de la bulle
   ============================================================ */
function ReactionsAffichees({ reactions, moi, onToggle }) {
  if (!reactions || reactions.length === 0) return null

  const visible = reactions.slice(0, 3)
  const masquees = reactions.length - visible.length

  return (
    <div className={`relative z-10 -mt-2 flex flex-wrap gap-1 pb-1 ${moi ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
      {visible.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle?.(r.emoji)}
          aria-pressed={Boolean(r.moi)}
          className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors ${FOCUS} ${
            r.moi
              ? 'border-blue-500/60 bg-blue-100 text-blue-800'
              : 'border-slate-200 bg-papier text-slate-800 hover:bg-slate-50'
          }`}
          title={r.moi ? 'Retirer ma réaction' : `Réagir avec ${r.emoji}`}
          aria-label={`${r.emoji} ${r.nb}${r.moi ? ', retirer ma réaction' : ''}`}
        >
          <span className="text-sm leading-none" aria-hidden="true">{r.emoji}</span>
          <span className="text-[11px] font-semibold leading-none" aria-hidden="true">{r.nb}</span>
        </button>
      ))}
      {masquees > 0 && (
        <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-papier px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          +{masquees}
        </span>
      )}
    </div>
  )
}

/* ============================================================
   Menu contextuel
   Navigation au clavier : ↑ ↓ Début Fin, Échap pour fermer.
   ============================================================ */
function MenuMessage({ x, y, moi, peutCopier, onRepondre, onModifier, onCopier, onSupprimer, onFermer }) {
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

  // Le focus entre dans le menu à l'ouverture
  useEffect(() => {
    menuRef.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus()
  }, [])

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

  function surNavigation(e) {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])]
    if (items.length === 0) return
    const i = items.indexOf(document.activeElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1].focus()
    } else if (e.key === 'Tab') {
      onFermer()
    }
  }

  return createPortal(
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label="Options du message"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={surNavigation}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: LARGEUR_MENU,
        zIndex: 150,
        transformOrigin: 'top left',
      }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-papier shadow-2xl shadow-black/20"
    >
      <div className="py-1">
        <ItemMenu icone={Reply} label="Répondre" onClick={() => { onRepondre(); onFermer() }} />
        {moi && <ItemMenu icone={Pencil} label="Modifier" onClick={() => { onModifier(); onFermer() }} />}
        {peutCopier && <ItemMenu icone={Copy} label="Copier le texte" onClick={() => { onCopier(); onFermer() }} />}
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
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition focus-visible:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#E95420] ${
        danger
          ? 'text-red-700 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15 dark:focus-visible:bg-red-500/15'
          : 'text-slate-800 hover:bg-slate-100'
      }`}
    >
      <Icone
        className={`size-4 ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-600'}`}
        aria-hidden="true"
      />
      <span className="font-medium">{label}</span>
    </button>
  )
}

/* ============================================================
   Heure + coches, à l'intérieur de la bulle (en bas à droite)
   surFond = true : pour un message sans bulle (emoji seul), petite pastille lisible sur le fond
   Le statut ("Envoyé", "Lu", "Lu par 2/3") est annoncé aux lecteurs d'écran
   et se distingue aussi par la forme (1 ou 2 coches), pas seulement par la couleur.
   ============================================================ */
function MetaMessage({ m, moi, statut, surFond = false }) {
  const lu = m.nb_lecteurs > 0

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] leading-none text-slate-600 ${
        surFond ? 'rounded-full bg-papier/90 px-1.5 py-0.5 shadow-sm backdrop-blur-sm' : ''
      }`}
    >
      <span>
        {heureSeule(m.date_envoi)}
        {m.date_modification && ' · modifié'}
      </span>
      {moi && (
        <span title={statut} className="inline-flex">
          {lu
            ? <CheckCheck className="size-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            : <Check className="size-4 text-slate-500" aria-hidden="true" />}
          <span className="sr-only">{statut}</span>
        </span>
      )}
    </span>
  )
}

/* ============================================================
   Bulle d'un message

   Props de regroupement (optionnelles, true par défaut) :
   - premierDuGroupe : premier message d'une série du même expéditeur
                       → coin « queue » + nom de l'expéditeur (groupes)
   ============================================================ */
export default function Bulle({
  m,
  moi,
  conversation,
  premierDuGroupe = true,
  onRepondre,
  onModifier,
  onSupprimer,
  onReagir,
  onOuvrirEmoji,
}) {
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
  const [copie, setCopie] = useState(false)

  const bulleRef = useRef(null)
  const bulleVisuelleRef = useRef(null)

  const menuOuvert = menu !== null
  const fermerMenu = useCallback(() => setMenu(null), [])

  const contientFichier = !!(m.fichiers && m.fichiers.length > 0)
  const contenu = m.contenu?.trim() ?? ''
  const dejaReagi = new Set((m.reactions || []).filter((r) => r.moi).map((r) => r.emoji))

  // Emoji seul : grand, sans bulle colorée
  const emojiSeul = contenu !== '' && !contientFichier && !m.reponse_a && RE_EMOJI_SEUL.test(contenu)

  // Texte seul : l'heure se place dans le coin de la dernière ligne
  const metaDansTexte = contenu !== '' && !contientFichier

  // Place réservée à la fin du texte pour que l'heure ne le recouvre jamais
  const largeurReservee = (moi ? 76 : 44) + (m.date_modification ? 52 : 0)

  // Le message « Copié » disparaît tout seul
  useEffect(() => {
    if (!copie) return undefined
    const t = setTimeout(() => setCopie(false), DUREE_RETOUR_COPIE)
    return () => clearTimeout(t)
  }, [copie])

  function afficherBarre() {
    if (bulleRef.current) {
      const rect = bulleRef.current.getBoundingClientRect()
      setPositionBarre(rect.top >= ESPACE_MIN_AU_DESSUS ? 'above' : 'below')
    }
    setBarreVisible(true)
  }

  function ouvrirMenuDepuisBouton(e) {
    if (menuOuvert) return fermerMenu()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({
      x: moi ? rect.right - LARGEUR_MENU : rect.left,
      y: rect.bottom + 6,
    })
  }

  async function copier() {
    if (!m.contenu) return
    try {
      await navigator.clipboard.writeText(m.contenu)
      setBarreVisible(false)
      setCopie(true)
    } catch {
      /* presse-papiers indisponible : on ne signale rien de faux */
    }
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

  // Écrans tactiles : pas de survol, un appui sur la bulle affiche ou masque la barre d'actions
  function surAppui() {
    if (window.matchMedia?.('(hover: none)').matches) {
      barreVisible ? setBarreVisible(false) : afficherBarre()
    }
  }

  function surMenuContextuel(e) {
    e.preventDefault()
    setBarreVisible(false)
    setMenu({ x: e.clientX, y: e.clientY })
  }

  const dissolution = rectPoussiere !== null
  const barreAffichee = (barreVisible || menuOuvert) && !dissolution && !copie

  // Coin « queue » sur le premier message d'une série
  const coinQueue = premierDuGroupe ? (moi ? 'rounded-tr-md' : 'rounded-tl-md') : ''

  return (
    <div
      className={`group flex items-start gap-2 ${moi ? 'justify-end' : 'justify-start'}`}
      style={{
        opacity: dissolution ? 0 : 1,
        transition: 'opacity 0.18s ease-out',
        pointerEvents: dissolution ? 'none' : undefined,
      }}
    >
      {/* Wrapper bulle + réactions (la barre d'actions y est ancrée).
          Largeur limitée pour garder des lignes confortables à lire (~65 caractères). */}
      <div
        ref={bulleRef}
        tabIndex={0}
        className={`relative max-w-[85%] rounded-2xl focus-visible:outline-offset-2 md:max-w-[min(34rem,70%)] ${FOCUS}`}
        onMouseEnter={afficherBarre}
        onMouseLeave={() => setBarreVisible(false)}
        onFocus={afficherBarre}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setBarreVisible(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setBarreVisible(false)
        }}
      >
        <AnimatePresence>
          {barreAffichee && (
            <BarreActions
              dejaReagi={dejaReagi}
              onReagir={(emoji) => {
                onReagir?.(m, emoji)
                setBarreVisible(false)
              }}
              onPlusEmojis={() => {
                const rect = bulleRef.current?.getBoundingClientRect()
                onOuvrirEmoji?.(m, rect)
                setBarreVisible(false)
              }}
              onMenu={ouvrirMenuDepuisBouton}
              menuOuvert={menuOuvert}
              position={positionBarre}
              align={moi ? 'right' : 'left'}
            />
          )}
        </AnimatePresence>

        {/* Retour visuel après « Copier le texte » :
            slate-800 + text-papier s'inversent avec le thème, donc toujours lisibles */}
        <AnimatePresence>
          {copie && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`absolute -top-9 z-30 flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-papier shadow-lg ${
                moi ? 'right-0' : 'left-0'
              }`}
            >
              <Check className="size-3.5" aria-hidden="true" />
              Texte copié
            </motion.div>
          )}
        </AnimatePresence>

        {emojiSeul ? (
          /* ---------- Emoji seul : grand, sans bulle ---------- */
          <div
            ref={bulleVisuelleRef}
            onClick={surAppui}
            onContextMenu={surMenuContextuel}
            className={`flex flex-col gap-1 ${moi ? 'items-end' : 'items-start'}`}
          >
            <p className="text-[40px] leading-none">{contenu}</p>
            <MetaMessage m={m} moi={moi} statut={statut} surFond />
          </div>
        ) : (
          /* ---------- Bulle classique ---------- */
          <div
            ref={bulleVisuelleRef}
            onClick={surAppui}
            onContextMenu={surMenuContextuel}
            className={`relative rounded-2xl px-3.5 py-2 shadow-sm ${coinQueue} ${
              moi ? STYLE_BULLE_MOI : STYLE_BULLE_AUTRE
            }`}
          >
            {!moi && premierDuGroupe && conversation.type !== 'DIRECT' && (
              <p className="mb-0.5 text-xs font-semibold text-blue-700">
                {m.expediteur?.prenom} {m.expediteur?.nom}
              </p>
            )}

            {m.reponse_a && (
              <div
                className={`mb-2 rounded-lg border-l-4 border-blue-500 px-2.5 py-1.5 text-xs ${
                  moi ? 'bg-blue-500/10' : 'bg-slate-100'
                }`}
              >
                <p className="text-xs font-semibold text-blue-700">{m.reponse_a.expediteur}</p>
                <p className="mt-0.5 truncate text-slate-700">{m.reponse_a.apercu}</p>
              </div>
            )}

            {contenu && (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">
                {m.contenu}
                {/* Espace invisible réservé à l'heure et aux coches */}
                {metaDansTexte && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-0 align-bottom"
                    style={{ width: largeurReservee }}
                  />
                )}
              </p>
            )}

            {contientFichier && <ApercuImages fichiers={m.fichiers} moi={moi} />}

            {/* Heure + coches */}
            {metaDansTexte ? (
              <span className="absolute bottom-1.5 right-3">
                <MetaMessage m={m} moi={moi} statut={statut} />
              </span>
            ) : (
              <div className="mt-1 flex justify-end">
                <MetaMessage m={m} moi={moi} statut={statut} />
              </div>
            )}
          </div>
        )}

        {/* Réactions (chevauchent légèrement le bas de la bulle) */}
        <ReactionsAffichees
          reactions={m.reactions || []}
          moi={moi}
          onToggle={(emoji) => onReagir?.(m, emoji)}
        />
      </div>

      {/* Menu contextuel */}
      <AnimatePresence>
        {menu && (
          <MenuMessage
            key="menu"
            x={menu.x}
            y={menu.y}
            moi={moi}
            peutCopier={Boolean(m.contenu)}
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
          couleurs={couleursPoussiere(moi)}
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
