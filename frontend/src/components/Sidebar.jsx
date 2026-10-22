import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ClipboardCheck,
  Contact,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  PanelLeft,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { salleDe } from '../salle'
import { Avatar } from './ui'
import ConfirmationModal from './ConfirmationModal'

const LOGO = '/assets/fulmar-logo.png'
const AFFICHER_RECHERCHE = false

// Les pages peuvent demander un rafraîchissement immédiat des pastilles :
// window.dispatchEvent(new Event('fulmar:badges'))
const EVENEMENT_BADGES = 'fulmar:badges'
const INTERVALLE_BADGES = 60_000
const DELAI_MIN_BADGES = 10_000

const SECTIONS = [
  {
    cle: 'espace-travail',
    titre: null,
    entrees: [
      { cle: 'dashboard', to: '/', end: true, libelle: 'Tableau de bord', texteCourt: 'Accueil', icone: LayoutDashboard },
      { cle: 'conversations', to: '/conversations', libelle: 'Conversations', texteCourt: 'Messages', icone: MessagesSquare, badge: 'messagerie' },
      { cle: 'a-traiter', to: '/a-traiter', libelle: 'À traiter', texteCourt: 'Actions', icone: ClipboardCheck, badge: 'actions' },
      { cle: 'documents', to: '/documents', libelle: 'Documents', texteCourt: 'Fichiers', icone: FolderOpen },
      { cle: 'notifications', to: '/notifications', libelle: 'Notifications', texteCourt: 'Notifs', icone: Bell, badge: 'notifications' },
      { cle: 'annuaire', to: '/annuaire', libelle: 'Annuaire', texteCourt: 'Annuaire', icone: Contact },
    ],
  },
  {
    cle: 'administration',
    titre: 'Système',
    reservee: true,
    entrees: [
      { cle: 'admin', to: '/admin', libelle: 'Administration', texteCourt: 'Admin', icone: ShieldCheck },
    ],
  },
]

const ANNEAU_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3D8D2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2925]'

/* ============================================================
   Utilitaires et hooks
   ============================================================ */
function trouverEntreeActive(entrees, pathname, salle) {
  let meilleure = null
  for (const e of entrees) {
    const correspond = e.end ? pathname === e.to : pathname === e.to || pathname.startsWith(`${e.to}/`)
    if (correspond && (!meilleure || e.to.length > meilleure.to.length)) meilleure = e
  }
  return meilleure ?? entrees.find((e) => e.cle === salle) ?? null
}

function estSaisie(cible) {
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(cible?.tagName) || cible?.isContentEditable
}

/** true quand l'écran est de type bureau (≥ 1024 px). */
function useBureau() {
  const requete = '(min-width: 1024px)'
  const [bureau, setBureau] = useState(() => window.matchMedia(requete).matches)
  useEffect(() => {
    const mq = window.matchMedia(requete)
    const maj = () => setBureau(mq.matches)
    mq.addEventListener('change', maj)
    return () => mq.removeEventListener('change', maj)
  }, [])
  return bureau
}

/**
 * Compteurs des pastilles « À traiter » et « Notifications ».
 * Rafraîchis : au montage, à chaque changement de page, toutes les 60 s,
 * au retour sur l'onglet et sur demande (événement « fulmar:badges »).
 */
function useCompteurs(actif, pathname) {
  const [compteurs, setCompteurs] = useState({
    actions: { n: 0, urgent: false },
    notifications: { n: 0, urgent: false },
  })
  const dernier = useRef(0)

  const charger = useCallback(async (force = false) => {
    if (document.visibilityState !== 'visible') return
    if (!force && Date.now() - dernier.current < DELAI_MIN_BADGES) return
    dernier.current = Date.now()

    const [actions, notifications] = await Promise.allSettled([
      api.get('/api/actions'),
      api.get('/api/notifications'),
    ])

    setCompteurs((precedent) => {
      const suivant = { ...precedent }

      if (actions.status === 'fulfilled') {
        const d = actions.value.data
        const liste = d?.actions ?? []
        suivant.actions = {
          n: d?.en_attente ?? liste.length,
          urgent: liste.some((a) => a.en_retard),
        }
      }

      if (notifications.status === 'fulfilled') {
        const d = notifications.value.data
        const liste = Array.isArray(d) ? d : (d?.data ?? [])
        const nonLues = liste.filter((n) => !n.est_lue)
        suivant.notifications = {
          n: nonLues.length,
          urgent: nonLues.some((n) => n.type === 'action_requise'),
        }
      }

      return suivant
    })
  }, [])

  useEffect(() => {
    if (!actif) return undefined
    charger()
    const timer = setInterval(() => charger(true), INTERVALLE_BADGES)
    const surRetour = () => charger()
    const surDemande = () => charger(true)
    document.addEventListener('visibilitychange', surRetour)
    window.addEventListener(EVENEMENT_BADGES, surDemande)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', surRetour)
      window.removeEventListener(EVENEMENT_BADGES, surDemande)
    }
  }, [actif, charger])

  // Changement de page : on actualise (limité à 1 fois / 10 s)
  useEffect(() => {
    if (actif) charger()
  }, [actif, pathname, charger])

  return compteurs
}

/* ============================================================
   Pastille de compteur
   ============================================================ */
function Pastille({ valeur, urgent, compacte }) {
  if (!valeur || valeur <= 0) return null
  const texte = valeur > 99 ? '99+' : valeur
  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold text-white ${
        urgent ? 'bg-red-500' : 'bg-[#E95420]'
      } ${
        compacte
          ? 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[9px] ring-2 ring-[#0B2925]'
          : 'h-5 min-w-5 px-1.5 text-[11px]'
      }`}
      aria-label={`${valeur} élément${valeur > 1 ? 's' : ''} en attente`}
    >
      {texte}
    </span>
  )
}

/* ============================================================
   Entrée de navigation
   ============================================================ */
function Entree({ entree, actif, badge, replie, onClick }) {
  const Icone = entree.icone
  const valeur = badge?.n ?? 0
  const titre = replie ? (valeur > 0 ? `${entree.libelle} (${valeur})` : entree.libelle) : undefined

  return (
    <NavLink
      to={entree.to}
      end={entree.end}
      onClick={onClick}
      title={titre}
      className={`group relative flex items-center rounded-xl transition-colors duration-200 ${ANNEAU_FOCUS} ${
        replie ? 'h-14 flex-col justify-center gap-0.5 px-1' : 'h-11 gap-3 px-3'
      } ${
        actif
          ? 'bg-white/10 font-semibold text-white'
          : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {actif && (
        <span
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#E95420]"
          aria-hidden="true"
        />
      )}

      <Icone
        className={`size-5 shrink-0 transition-colors ${
          actif ? 'text-[#E95420]' : 'text-white/50 group-hover:text-white'
        }`}
        aria-hidden="true"
      />

      {replie ? (
        <span className="max-w-full truncate text-[10px] font-medium leading-tight">
          {entree.texteCourt || entree.libelle}
        </span>
      ) : (
        <>
          <span className="flex-1 truncate">{entree.libelle}</span>
          <Pastille valeur={valeur} urgent={badge?.urgent} />
        </>
      )}

      {replie && <Pastille valeur={valeur} urgent={badge?.urgent} compacte />}
    </NavLink>
  )
}

/* ============================================================
   Sidebar
   ============================================================ */
export default function Sidebar({ ouvert, onFermer, replie: repliePrefere, onBasculerRepli }) {
  const { utilisateur, deconnexion } = useAuth()
  const { conversationsNonLues } = useMessagerie()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const bureau = useBureau()

  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)
  const [recherche, setRecherche] = useState('')
  const champRecherche = useRef(null)

  // Le mode replié n'a de sens que sur grand écran : le tiroir mobile reste toujours déplié
  const replie = Boolean(repliePrefere) && bureau

  const estAdmin = utilisateur?.role?.libelle === 'Administrateur'
  const salle = salleDe(pathname)
  const compteurs = useCompteurs(Boolean(utilisateur), pathname)

  useEffect(() => {
    document.documentElement.dataset.salle = salle
  }, [salle])

  const sections = SECTIONS.filter((s) => !s.reservee || estAdmin)
  const entreeActive = trouverEntreeActive(sections.flatMap((s) => s.entrees), pathname, salle)

  const badges = {
    messagerie: { n: conversationsNonLues.length, urgent: false },
    actions: compteurs.actions,
    notifications: compteurs.notifications,
  }

  /* ---------- Tiroir mobile : Échap pour fermer + blocage du défilement de la page ---------- */
  useEffect(() => {
    if (!ouvert || bureau) return undefined
    const surTouche = (e) => {
      if (e.key === 'Escape') onFermer()
    }
    const ancien = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', surTouche)
    return () => {
      document.body.style.overflow = ancien
      document.removeEventListener('keydown', surTouche)
    }
  }, [ouvert, bureau, onFermer])

  /* ---------- Raccourcis : Ctrl/Cmd + B replie le menu, Ctrl/Cmd + K la recherche ---------- */
  useEffect(() => {
    function surTouche(e) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const touche = e.key.toLowerCase()
      if (touche === 'b' && bureau && !estSaisie(e.target)) {
        e.preventDefault()
        onBasculerRepli()
      }
      if (touche === 'k' && AFFICHER_RECHERCHE && champRecherche.current) {
        e.preventDefault()
        champRecherche.current.focus()
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [bureau, onBasculerRepli])

  /** Ferme le tiroir uniquement sur mobile. */
  const fermerMobile = () => {
    if (!bureau) onFermer()
  }

  async function confirmerDeconnexion() {
    setDeconnexionEnCours(true)
    try {
      await deconnexion()
      setConfirmationOuverte(false)
    } finally {
      setDeconnexionEnCours(false)
    }
  }

  function lancerRecherche(e) {
    e.preventDefault()
    const terme = recherche.trim()
    if (!terme) return
    navigate(`/conversations?q=${encodeURIComponent(terme)}`)
    setRecherche('')
    fermerMobile()
  }

  return (
    <>
      {ouvert && !bureau && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onFermer}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-[#0B2925] transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
          replie ? 'w-20' : 'w-64'
        } ${ouvert ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation principale"
      >
        {/* ===== Marque ===== */}
        {!replie ? (
          <div className="flex items-center gap-2 px-4 pt-6">
            <img src={LOGO} alt="" className="size-11 shrink-0 object-contain" />
            <span className="flex-1 font-display text-xl font-extrabold leading-none text-white">
              Fulmar
            </span>

            <button
              type="button"
              className={`rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden ${ANNEAU_FOCUS}`}
              onClick={onFermer}
              aria-label="Fermer le menu"
            >
              <X className="size-5" />
            </button>
            <button
              type="button"
              onClick={onBasculerRepli}
              className={`hidden rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:flex ${ANNEAU_FOCUS}`}
              aria-label="Replier le menu"
              title="Replier (Ctrl + B)"
            >
              <PanelLeft className="size-5" />
            </button>
          </div>
        ) : (
          // Mode replié : logo puis bouton, empilés et centrés (la largeur de 80 px ne permet pas de les mettre côte à côte)
          <div className="flex flex-col items-center gap-2 pt-5">
            <img src={LOGO} alt="Fulmar" className="size-10 shrink-0 object-contain" />
            <button
              type="button"
              onClick={onBasculerRepli}
              className={`rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white ${ANNEAU_FOCUS}`}
              aria-label="Déplier le menu"
              title="Déplier (Ctrl + B)"
            >
              <PanelLeft className="size-5" />
            </button>
          </div>
        )}

        {/* ===== Recherche (activable avec AFFICHER_RECHERCHE) ===== */}
        {AFFICHER_RECHERCHE && !replie && (
          <form onSubmit={lancerRecherche} className="px-4 pt-5" role="search">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50"
                aria-hidden="true"
              />
              <input
                ref={champRecherche}
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher dans les conversations"
                className={`w-full rounded-xl bg-white/10 py-2 pl-9 pr-12 text-sm text-white placeholder:text-white/50 ${ANNEAU_FOCUS}`}
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/20 px-1 text-[10px] text-white/50">
                Ctrl K
              </kbd>
            </div>
          </form>
        )}

        {/* ===== Navigation ===== */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden ${replie ? 'pt-4' : 'pt-6'}`}
          aria-label="Menu"
        >
          {sections.map((section, index) => (
            <Fragment key={section.cle}>
              {index > 0 && (
                <div className={`my-3 border-t border-white/10 ${replie ? 'mx-3' : 'mx-6'}`} />
              )}

              {section.titre && !replie && (
                <div className="mb-2 flex h-8 items-end px-6">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                    {section.titre}
                  </span>
                </div>
              )}

              <div className={`px-2 ${replie ? 'space-y-1' : 'space-y-1.5'}`}>
                {section.entrees.map((entree) => (
                  <Entree
                    key={entree.cle}
                    entree={entree}
                    actif={entree.cle === entreeActive?.cle}
                    badge={entree.badge ? badges[entree.badge] : null}
                    replie={replie}
                    onClick={fermerMobile}
                  />
                ))}
              </div>
            </Fragment>
          ))}
        </nav>

        {/* ===== Profil + déconnexion ===== */}
        {utilisateur && (
          <div className="border-t border-white/10 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            {replie ? (
              <div className="flex flex-col items-center gap-2">
                <NavLink
                  to="/profil"
                  onClick={fermerMobile}
                  title="Mon compte"
                  aria-label="Mon compte"
                  className={`rounded-full ${ANNEAU_FOCUS}`}
                >
                  <Avatar
                    prenom={utilisateur.prenom}
                    nom={utilisateur.nom}
                    taille="sm"
                    photoUrl={utilisateur.photo_url}
                  />
                </NavLink>
                <button
                  type="button"
                  onClick={() => setConfirmationOuverte(true)}
                  className={`rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400 ${ANNEAU_FOCUS}`}
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <NavLink
                  to="/profil"
                  onClick={fermerMobile}
                  className={({ isActive }) =>
                    `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${ANNEAU_FOCUS} ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    }`
                  }
                >
                  <Avatar
                    prenom={utilisateur.prenom}
                    nom={utilisateur.nom}
                    taille="sm"
                    photoUrl={utilisateur.photo_url}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {utilisateur.prenom} {utilisateur.nom}
                    </p>
                    <p className="truncate text-xs text-white/60">{utilisateur.role?.libelle}</p>
                  </div>
                </NavLink>
                <button
                  type="button"
                  onClick={() => setConfirmationOuverte(true)}
                  className={`shrink-0 rounded-lg p-2.5 text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400 ${ANNEAU_FOCUS}`}
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      <ConfirmationModal
        ouvert={confirmationOuverte}
        onFermer={() => setConfirmationOuverte(false)}
        onConfirmer={confirmerDeconnexion}
        titre="Se déconnecter ?"
        message="Vous allez être déconnecté de votre session. Vous devrez vous reconnecter pour accéder à nouveau à votre espace."
        texteConfirmer="Se déconnecter"
        texteAnnuler="Annuler"
        variant="danger"
        enCours={deconnexionEnCours}
      />
    </>
  )
}