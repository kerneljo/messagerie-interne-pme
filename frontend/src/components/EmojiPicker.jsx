import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

/* ============================================================
   Données
   Un émoji peut être une simple chaîne, ou un objet
   { e, nom, mots } : « nom » sert à l'accessibilité, « mots » à la recherche.
   ============================================================ */
const E = (e, nom, mots = '') => ({ e, nom, mots })

const CATEGORIES = [
  {
    id: 'travail',
    nom: 'Travail',
    icone: '💼',
    emojis: [
      E('👍', 'Pouce levé', 'ok accord valider bien recu d accord'),
      E('✅', 'Terminé', 'fait valide termine coche ok'),
      E('🙏', 'Merci', 'svp priere remerciement s il vous plait'),
      E('👀', 'Je regarde', 'vu en cours prise en charge oeil'),
      E('👏', 'Bravo', 'felicitations applaudir'),
      E('💡', 'Idée', 'suggestion ampoule proposition'),
      E('🤝', 'Accord', 'partenariat poignee de main deal'),
      E('🎯', 'Objectif', 'cible atteint but'),
      E('🚀', 'Lancement', 'fusee demarrage avance'),
      E('📌', 'À retenir', 'epingle important'),
      E('📎', 'Pièce jointe', 'trombone fichier document'),
      E('📅', 'Date', 'calendrier reunion echeance rendez-vous'),
      E('⏳', 'En cours', 'attente sablier delai'),
      E('🔔', 'Rappel', 'notification cloche alerte'),
      E('⚠️', 'Attention', 'vigilance danger avertissement'),
      E('❗', 'Urgent', 'important exclamation'),
      E('❓', 'Question', 'interrogation'),
      E('🎉', 'Félicitations', 'fete reussite celebration'),
      E('😊', 'Sourire', 'content cordial aimable'),
      E('📈', 'Progression', 'hausse croissance graphique resultats'),
      E('📝', 'Note', 'memo rediger compte rendu'),
      E('📞', 'Appel', 'telephone appeler'),
      E('✉️', 'Courriel', 'email message lettre'),
      E('🔒', 'Confidentiel', 'verrouille securise prive'),
      E('🔍', 'Vérifier', 'recherche loupe examiner'),
      E('💬', 'Discussion', 'message bulle commentaire'),
      E('🙌', 'Excellent', 'bravo victoire'),
      E('⭐', 'Favori', 'etoile important'),
      E('✔️', 'Validé', 'coche ok'),
      E('🔄', 'Mise à jour', 'actualiser synchroniser reprendre'),
    ],
  },
  {
    id: 'emotions',
    nom: 'Émotions',
    icone: '😀',
    emojis: [
      E('😀', 'Sourire', 'content joyeux'),
      '😃',
      '😄',
      E('😁', 'Grand sourire', 'content'),
      '😆',
      E('😅', 'Soulagement', 'gene sueur'),
      E('🤣', 'Fou rire', 'rire mort de rire'),
      E('😂', 'Rire', 'larmes de joie drole'),
      E('🙂', 'Sourire léger', 'poli'),
      '🙃',
      E('😉', 'Clin d’œil', 'complicite'),
      E('😊', 'Sourire', 'content cordial'),
      E('😇', 'Ange', 'innocent'),
      E('🥰', 'Affection', 'amour adorable'),
      E('😍', 'Adoration', 'amour yeux coeur'),
      E('🤩', 'Enthousiaste', 'impressionne wow etoiles'),
      '😘',
      '😗',
      '😚',
      '😙',
      '🥲',
      E('😋', 'Délicieux', 'miam'),
      '😛',
      '😜',
      '🤪',
      '😝',
      E('🤗', 'Câlin', 'accueil'),
      '🤭',
      E('🤫', 'Chut', 'secret discret'),
      E('🤔', 'Réflexion', 'doute hmm penser'),
      '🤐',
      '🤨',
      E('😐', 'Neutre', 'indifferent'),
      '😑',
      '😶',
      '😏',
      '😒',
      E('🙄', 'Agacé', 'ennui yeux au ciel'),
      E('😬', 'Gêné', 'embarrasse grimace'),
      '🤥',
      '😌',
      E('😔', 'Déçu', 'triste pensif'),
      '😪',
      '🤤',
      E('😴', 'Fatigué', 'sommeil dormir'),
      E('😮', 'Surpris', 'etonne'),
      E('😢', 'Triste', 'pleurs larme'),
      E('😭', 'Sanglots', 'pleurer'),
      E('😡', 'En colère', 'furieux'),
      E('🥳', 'Fête', 'celebration anniversaire'),
    ],
  },
  {
    id: 'gestes',
    nom: 'Gestes',
    icone: '👋',
    emojis: [
      E('👍', 'Pouce levé', 'ok accord'),
      E('👎', 'Pouce baissé', 'refus desaccord'),
      E('👌', 'Parfait', 'ok'),
      E('✌️', 'Victoire', 'paix'),
      E('🤞', 'Doigts croisés', 'chance espoir'),
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      E('👆', 'Vers le haut', 'pointer'),
      '👇',
      '☝️',
      E('✋', 'Main levée', 'stop attendre'),
      '🤚',
      '🖐️',
      '🖖',
      E('👋', 'Salut', 'bonjour au revoir main'),
      E('🤝', 'Poignée de main', 'accord partenariat'),
      E('🙏', 'Mains jointes', 'merci svp'),
      E('💪', 'Force', 'muscle courage'),
      '🦾',
      '✊',
      '👊',
      '🤛',
      '🤜',
      E('👏', 'Applaudissements', 'bravo'),
      E('🙌', 'Mains levées', 'bravo victoire'),
      '👐',
      '🤲',
    ],
  },
  {
    id: 'objets',
    nom: 'Objets',
    icone: '📁',
    emojis: [
      E('📎', 'Pièce jointe', 'trombone fichier'),
      E('📁', 'Dossier', 'repertoire fichiers'),
      E('📂', 'Dossier ouvert', 'repertoire'),
      E('📅', 'Calendrier', 'date reunion'),
      '📆',
      '📇',
      E('📈', 'Hausse', 'progression graphique'),
      E('📉', 'Baisse', 'diminution graphique'),
      E('📊', 'Statistiques', 'graphique rapport'),
      E('📋', 'Liste', 'presse-papiers checklist'),
      E('📌', 'Épingle', 'important'),
      '📍',
      '📏',
      '📐',
      '✂️',
      '🗃️',
      '🗄️',
      '🗑️',
      E('🔒', 'Verrouillé', 'confidentiel securise'),
      E('🔓', 'Déverrouillé', 'ouvert'),
      E('🔑', 'Clé', 'acces mot de passe'),
      '🔨',
      '🔧',
      '🔩',
      E('⚙️', 'Paramètres', 'reglages configuration'),
      E('💼', 'Mallette', 'travail bureau'),
      E('📞', 'Téléphone', 'appel'),
      E('📱', 'Mobile', 'telephone portable'),
      E('💻', 'Ordinateur', 'portable pc'),
      '🖥️',
      '⌨️',
      '🖱️',
      E('🖨️', 'Imprimante', 'imprimer'),
      E('💡', 'Ampoule', 'idee'),
      E('🔔', 'Cloche', 'notification rappel'),
      E('📢', 'Annonce', 'megaphone communique'),
      '📣',
      E('⏰', 'Réveil', 'alarme heure'),
      E('⏱️', 'Chronomètre', 'duree temps'),
    ],
  },
  {
    id: 'symboles',
    nom: 'Symboles',
    icone: '✅',
    emojis: [
      E('✅', 'Terminé', 'fait valide coche'),
      E('❌', 'Refusé', 'croix non erreur annule'),
      E('⚠️', 'Attention', 'vigilance'),
      E('❗', 'Urgent', 'important'),
      E('❓', 'Question', 'interrogation'),
      '💯',
      E('⭐', 'Étoile', 'favori'),
      E('✨', 'Nouveau', 'etincelles'),
      '💫',
      E('⚡', 'Rapide', 'eclair energie'),
      '💥',
      '💢',
      '💤',
      E('💬', 'Discussion', 'message bulle'),
      '💭',
      '🗯️',
      E('♻️', 'Recyclage', 'recycler'),
      E('🔴', 'Rouge', 'statut bloque critique'),
      E('🟠', 'Orange', 'statut risque'),
      E('🟡', 'Jaune', 'statut vigilance'),
      E('🟢', 'Vert', 'statut ok termine'),
      E('🔵', 'Bleu', 'statut information'),
      '🟣',
      '⚫',
      '⚪',
      '🔺',
      '🔻',
      '🔸',
      '🔹',
    ],
  },
  {
    id: 'animaux',
    nom: 'Animaux',
    icone: '🐶',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄'],
  },
  {
    id: 'nourriture',
    nom: 'Nourriture',
    icone: '🍎',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🌽', '🥕', '🌶️', '🥒', '🥬', '🍞', '🥐', '🥖', '🍔', '🍕', '🍟'],
  },
  {
    id: 'activites',
    nom: 'Activités',
    icone: '⚽',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘'],
  },
]

export const HAUTEUR_PICKER = 400
export const LARGEUR_PICKER = 340

const CLE_RECENTS = 'fulmar:emojis-recents'
const NB_RECENTS = 16
const POLICE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'

/* ============================================================
   Utilitaires
   ============================================================ */
const normaliser = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const enObjet = (x) => (typeof x === 'string' ? { e: x, nom: '', mots: '' } : x)

// Index de recherche, construit une seule fois
const INDEX = (() => {
  const vus = new Set()
  const liste = []
  for (const cat of CATEGORIES) {
    for (const brut of cat.emojis) {
      const item = enObjet(brut)
      if (vus.has(item.e)) continue
      vus.add(item.e)
      liste.push({ ...item, nom: item.nom || cat.nom, texte: normaliser(`${item.nom} ${item.mots} ${cat.nom}`) })
    }
  }
  return liste
})()

const NOMS = Object.fromEntries(INDEX.map((i) => [i.e, i.nom]))

function lireRecents() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_RECENTS))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, NB_RECENTS) : []
  } catch {
    return []
  }
}

function memoriser(emoji) {
  try {
    const suivant = [emoji, ...lireRecents().filter((x) => x !== emoji)].slice(0, NB_RECENTS)
    localStorage.setItem(CLE_RECENTS, JSON.stringify(suivant))
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/* ============================================================
   Grille d'émojis
   ============================================================ */
function Grille({ emojis, onChoisir }) {
  return (
    <div className="grid grid-cols-8 gap-0.5" style={{ fontFamily: POLICE_EMOJI }}>
      {emojis.map((emoji, i) => {
        const nom = NOMS[emoji] || 'Émoji'
        return (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChoisir(emoji)}
            title={nom}
            aria-label={`${nom} ${emoji}`}
            className="flex size-9 items-center justify-center rounded-lg text-xl transition-all hover:scale-110 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95420] active:scale-95"
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
   Sélecteur
   ============================================================ */
export default function EmojiPicker({ onSelection, onFermer }) {
  const [recherche, setRecherche] = useState('')
  const [recents] = useState(lireRecents)
  const [actif, setActif] = useState(recents.length > 0 ? 'recents' : 'travail')
  const champ = useRef(null)
  const liste = useRef(null)
  const sectionsRef = useRef({})

  const sections = useMemo(() => {
    const base = CATEGORIES.map((c) => ({ id: c.id, nom: c.nom, icone: c.icone, emojis: c.emojis.map((x) => enObjet(x).e) }))
    return recents.length > 0 ? [{ id: 'recents', nom: 'Récents', icone: '🕘', emojis: recents }, ...base] : base
  }, [recents])

  const terme = normaliser(recherche)
  const resultats = useMemo(
    () => (terme ? INDEX.filter((i) => i.texte.includes(terme)).map((i) => i.e) : []),
    [terme],
  )

  // Focus sur la recherche (bureau uniquement, pour ne pas ouvrir le clavier mobile)
  useEffect(() => {
    if (window.matchMedia?.('(hover: hover)').matches) champ.current?.focus()
  }, [])

  // Échap : efface d'abord la recherche, puis ferme
  useEffect(() => {
    const surTouche = (e) => {
      if (e.key !== 'Escape') return
      if (recherche) setRecherche('')
      else onFermer()
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [recherche, onFermer])

  const choisir = (emoji) => {
    memoriser(emoji)
    onSelection(emoji)
    onFermer()
  }

  const aller = (id) => {
    const el = sectionsRef.current[id]
    if (!el || !liste.current) return
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    liste.current.scrollTo({ top: el.offsetTop, behavior: reduit ? 'auto' : 'smooth' })
    setActif(id)
  }

  const surDefilement = () => {
    const l = liste.current
    if (!l || terme) return
    let courant = sections[0].id
    for (const s of sections) {
      const el = sectionsRef.current[s.id]
      if (el && el.offsetTop - 8 <= l.scrollTop) courant = s.id
    }
    if (l.scrollTop + l.clientHeight >= l.scrollHeight - 2) courant = sections[sections.length - 1].id
    setActif(courant)
  }

  return (
    <div
      role="dialog"
      aria-label="Sélecteur d'émojis"
      className="flex flex-col overflow-hidden rounded-2xl bg-white"
      style={{
        width: LARGEUR_PICKER,
        height: HAUTEUR_PICKER,
        boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      }}
    >
      {/* Recherche + fermeture */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            ref={champ}
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un émoji…"
            aria-label="Rechercher un émoji"
            className="h-9 w-full rounded-lg bg-slate-100 pl-8 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E95420]/60"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => {
                setRecherche('')
                champ.current?.focus()
              }}
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Effacer la recherche"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fermer"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Onglets de catégories */}
      {!terme && (
        <div className="flex items-center justify-between border-b border-slate-100 px-2" role="tablist" aria-label="Catégories">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={actif === s.id}
              aria-label={s.nom}
              title={s.nom}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aller(s.id)}
              style={{ fontFamily: POLICE_EMOJI }}
              className={`relative flex h-9 flex-1 items-center justify-center text-base transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95420] ${
                actif === s.id ? 'opacity-100' : 'opacity-45 hover:opacity-80'
              }`}
            >
              {s.icone}
              {actif === s.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#E95420]" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Contenu */}
      <div
        ref={liste}
        onScroll={surDefilement}
        className="relative flex-1 overflow-y-auto bg-white px-3 py-2"
        style={{ overscrollBehavior: 'contain' }}
      >
        {terme ? (
          resultats.length > 0 ? (
            <>
              <h4 className="mb-2 text-xs font-semibold text-slate-500">
                {resultats.length} résultat{resultats.length > 1 ? 's' : ''}
              </h4>
              <Grille emojis={resultats} onChoisir={choisir} />
            </>
          ) : (
            <p className="px-2 py-10 text-center text-sm text-slate-500">
              Aucun émoji ne correspond à « {recherche.trim()} ».
            </p>
          )
        ) : (
          sections.map((s, idx) => (
            <div
              key={s.id}
              ref={(el) => {
                sectionsRef.current[s.id] = el
              }}
              className={idx > 0 ? 'mt-4' : ''}
            >
              <h4 className="mb-2 text-xs font-semibold text-slate-500">{s.nom}</h4>
              <Grille emojis={s.emojis} onChoisir={choisir} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
