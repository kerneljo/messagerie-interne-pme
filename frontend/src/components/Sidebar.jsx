import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Contact,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Search,
  ShieldCheck,
  Users,
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
const NB_RECENTS = 4

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
      { cle: 'notifications', to: '/notifications', libelle: 'Notifications', texteCourt: 'Alertes', icone: Bell, badge: 'notifications' },
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

const COULEUR_ACTIF = '#2563EB'
const COULEUR_BOUTON_REPLI = '#22C55E' // Vert de la maquette

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

  useEffect(() => {
    if (actif) charger()
  }, [actif, pathname, charger])

  return compteurs
}

function infoConversation(c, moi) {
  if (c.type === 'DIRECT') {
    const autre = c.participants?.find((p) => p.matricule !== moi?.matricule)
    return {
      prenom: autre?.prenom ?? c.titre ?? '',
      nom: autre?.nom ?? '',
      photo: autre?.photo_url ?? null,
      groupe: false,
    }
  }
  return { prenom: c.titre || 'Groupe', nom: '', photo: c.photo_url ?? null, groupe: true }
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
   Infobulle (mode replié)
   ============================================================ */
function InfoBulle({ texte, actif, children, className = 'block' }) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!actif) setPos(null)
  }, [actif])

  const afficher = (e) => {
    if (!actif || !texte) return
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.top + r.height / 2, left: r.right + 12 })
  }
  const masquer = () => setPos(null)

  return (
    <div
      className={className}
      onMouseEnter={afficher}
      onMouseLeave={masquer}
      onFocus={afficher}
      onBlur={masquer}
    >
      {children}
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#123B35] px-3 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10"
          >
            {texte}
          </div>,
          document.body,
        )}
    </div>
  )
}

/* ============================================================
   Entrée de navigation
   ============================================================ */
function Entree({ entree, actif, badge, replie, onClick }) {
  const Icone = entree.icone
  const valeur = badge?.n ?? 0
  const texteInfo = valeur > 0 ? `${entree.libelle} (${valeur})` : entree.libelle

  return (
    <InfoBulle texte={texteInfo} actif={replie}>
      <NavLink
        to={entree.to}
        end={entree.end}
        onClick={onClick}
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
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
            style={{ backgroundColor: COULEUR_ACTIF }}
            aria-hidden="true"
          />
        )}

        <Icone
          className="size-5 shrink-0 transition-colors"
          style={{ color: actif ? COULEUR_ACTIF : undefined }}
          aria-hidden="true"
        />

        {replie ? (
          <span className="max-w-full truncate text-[11px] font-medium leading-tight">
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
    </InfoBulle>
  )
}

/* ============================================================
   Section « Récents »
   ============================================================ */
function Recents({ conversations, moi, replie, onClick }) {
  const liste = (conversations ?? []).slice(0, NB_RECENTS)
  if (liste.length === 0) return null

  return (
    <section aria-label="Conversations récentes" className={replie ? 'mt-3' : 'mt-4'}>
      {replie && <div className="mx-3 mb-3 border-t border-white/10" />}

      {!replie && (
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Récents</h2>
          <Link
            to="/conversations"
            onClick={onClick}
            className={`rounded text-[10px] font-bold uppercase tracking-wider text-[#E95420] transition-colors hover:text-[#FF8A5C] ${ANNEAU_FOCUS}`}
          >
            Tout voir
          </Link>
        </div>
      )}

      <ul className={replie ? 'flex flex-col items-center gap-2' : 'space-y-1 px-2'}>
        {liste.map((c) => {
          const info = infoConversation(c, moi)
          const nonLus = c.non_lus ?? 0
          const titre = c.titre || info.prenom

          return (
            <li key={c.reference_conversation}>
              <InfoBulle texte={titre} actif={replie}>
                <NavLink
                  to={`/conversations/${c.reference_conversation}`}
                  onClick={onClick}
                  className={({ isActive }) =>
                    `relative flex items-center transition-colors ${ANNEAU_FOCUS} ${
                      replie
                        ? `size-12 justify-center rounded-full ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
                        : `h-10 gap-3 rounded-xl px-2 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`
                    }`
                  }
                >
                  <Avatar prenom={info.prenom} nom={info.nom} photoUrl={info.photo} taille="sm" />

                  {!replie && (
                    <>
                      <span
                        className={`flex-1 truncate text-sm ${
                          nonLus > 0 ? 'font-semibold text-white' : 'font-medium text-white/70'
                        }`}
                      >
                        {titre}
                      </span>
                      {nonLus > 0 ? (
                        <Pastille valeur={nonLus} />
                      ) : (
                        info.groupe && <Users className="size-3.5 shrink-0 text-white/30" aria-hidden="true" />
                      )}
                    </>
                  )}

                  {replie && nonLus > 0 && (
                    <span
                      className="absolute right-1 top-1 size-2.5 rounded-full bg-[#E95420] ring-2 ring-[#0B2925]"
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              </InfoBulle>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ============================================================
   Sidebar
   ============================================================ */
export default function Sidebar({ ouvert, onFermer, replie: repliePrefere, onBasculerRepli }) {
  const { utilisateur, deconnexion } = useAuth()
  const { conversations, conversationsNonLues } = useMessagerie()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const bureau = useBureau()

  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)
  const [recherche, setRecherche] = useState('')
  const champRecherche = useRef(null)

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
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-[#0B2925] transition-[width,transform] duration-200 lg:relative lg:translate-x-0 ${
          replie ? 'w-20' : 'w-64'
        } ${ouvert ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation principale"
      >
        {/* ===== En-tête (Logo, Nom, Repli, Fermer mobile) ===== */}
        <div
          className={`flex items-center ${
            replie ? 'flex-col gap-3 pt-5' : 'gap-2 pl-4 pr-3 pt-6 lg:pr-0'
          }`}
        >
          {/* ✅ LOGO BLANC INTÉGRÉ */}
          <img 
            src={LOGO} 
            alt="Fulmar" 
            className={`${replie ? 'size-8 shrink-0' : 'size-9 shrink-0'}`} 
            style={{ filter: 'brightness(0) invert(1)' }} 
          />

          {!replie && (
            <span className="flex-1 font-display text-xl font-extrabold leading-none text-white">
              Fulmar
            </span>
          )}

          {/* Fermer (mobile uniquement) */}
          {!replie && (
            <button
              type="button"
              className={`rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden ${ANNEAU_FOCUS}`}
              onClick={onFermer}
              aria-label="Fermer le menu"
            >
              <X className="size-5" />
            </button>
          )}

          {/* Replier / Déplier (bureau uniquement) */}
          <button
            type="button"
            onClick={onBasculerRepli}
            style={{ backgroundColor: COULEUR_BOUTON_REPLI }}
            className={`hidden h-9 shrink-0 items-center justify-center text-white shadow-[0_0_18px_rgba(34,197,94,0.45)] transition-[filter] duration-200 hover:brightness-110 lg:flex ${
              replie ? 'size-9 rounded-full' : 'w-11 rounded-l-full'
            } ${ANNEAU_FOCUS}`}
            aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
            aria-expanded={!replie}
            title={replie ? 'Déplier (Ctrl + B)' : 'Replier (Ctrl + B)'}
          >
            {replie ? (
              <ChevronRight className="size-5" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <ChevronLeft className="size-5" strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ===== Recherche ===== */}
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
            </div>
          </form>
        )}

        {/* ===== Navigation ===== */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${replie ? 'pt-4' : 'pt-6'}`} aria-label="Menu">
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

          <Recents
            conversations={conversations}
            moi={utilisateur}
            replie={replie}
            onClick={fermerMobile}
          />
        </nav>

        {/* ===== Profil + déconnexion ===== */}
        {utilisateur && (
          <div className="border-t border-white/10 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            {replie ? (
              <div className="flex flex-col items-center gap-2">
                <InfoBulle texte="Mon compte" actif={replie}>
                  <NavLink
                    to="/profil"
                    onClick={fermerMobile}
                    aria-label="Mon compte"
                    className={`block rounded-full ${ANNEAU_FOCUS}`}
                  >
                    <Avatar
                      prenom={utilisateur.prenom}
                      nom={utilisateur.nom}
                      taille="sm"
                      photoUrl={utilisateur.photo_url}
                    />
                  </NavLink>
                </InfoBulle>
                <InfoBulle texte="Se déconnecter" actif={replie}>
                  <button
                    type="button"
                    onClick={() => setConfirmationOuverte(true)}
                    className={`rounded-lg p-2 text-white/60 transition-colors hover:bg-red-500/10 hover:text-red-400 ${ANNEAU_FOCUS}`}
                    aria-label="Se déconnecter"
                  >
                    <LogOut className="size-5" />
                  </button>
                </InfoBulle>
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
