import { Fragment, useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Contact,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Bell,
  MessagesSquare,
  PanelLeft,
  ShieldCheck,
  ClipboardCheck,
  Search,
  X,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { salleDe } from '../salle'
import { Avatar } from './ui'
import ConfirmationModal from './ConfirmationModal'

const LOGO = '/assets/fulmar-logo.png'
const AFFICHER_RECHERCHE = false

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

function trouverEntreeActive(entrees, pathname, salle) {
  let meilleure = null
  for (const e of entrees) {
    const correspond = e.end ? pathname === e.to : pathname === e.to || pathname.startsWith(`${e.to}/`)
    if (correspond && (!meilleure || e.to.length > meilleure.to.length)) meilleure = e
  }
  return meilleure ?? entrees.find((e) => e.cle === salle) ?? null
}

const ANNEAU_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3D8D2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2925]'

function Entree({ entree, actif, badge, replie, onClick }) {
  const Icone = entree.icone
  return (
    <NavLink
      to={entree.to}
      end={entree.end}
      onClick={onClick}
      title={replie ? entree.libelle : undefined}
      className={`group relative flex items-center rounded-xl transition-colors duration-200 ${ANNEAU_FOCUS} ${
        replie 
          ? 'h-[54px] flex-col justify-center gap-0.5 px-1' 
          : 'h-11 gap-3 px-3'
      } ${
        actif
          ? 'bg-white/10 font-semibold text-white'
          : 'font-medium text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {actif && !replie && (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#E95420]" />
      )}

      <Icone
        className={`shrink-0 transition-colors ${
          actif ? 'text-[#E95420]' : 'text-white/50 group-hover:text-white'
        } size-5`}
        aria-hidden="true"
      />

      {replie ? (
        <span className="max-w-full truncate text-[9px] font-medium leading-tight">
          {entree.texteCourt || entree.libelle}
        </span>
      ) : (
        <>
          <span className="flex-1 truncate">{entree.libelle}</span>
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E95420] px-1.5 text-[11px] font-bold text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}

      {replie && badge > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E95420] px-1 text-[9px] font-bold text-white ring-2 ring-[#0B2925]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ ouvert, onFermer, replie, onBasculerRepli }) {
  const { utilisateur, deconnexion } = useAuth()
  const { conversationsNonLues } = useMessagerie()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)
  const [recherche, setRecherche] = useState('')

  const estAdmin = utilisateur?.role?.libelle === 'Administrateur'
  const salle = salleDe(pathname)

  useEffect(() => {
    document.documentElement.dataset.salle = salle
  }, [salle])

  const sections = SECTIONS.filter((s) => !s.reservee || estAdmin)
  const entreeActive = trouverEntreeActive(sections.flatMap((s) => s.entrees), pathname, salle)

  const badges = { messagerie: conversationsNonLues.length }

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
    if (recherche.trim()) {
      navigate(`/conversations?q=${encodeURIComponent(recherche.trim())}`)
      setRecherche('')
      if (window.innerWidth < 1024) onFermer()
    }
  }

  return (
    <>
      {ouvert && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onFermer} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-[#0B2925] transition-all duration-200 lg:static lg:translate-x-0 ${
          replie ? 'w-20' : 'w-64'
        } ${ouvert ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation principale"
      >
        {/* ===== Marque (Logo + Nom) ===== */}
        {!replie ? (
          <div className="flex items-center gap-2 px-4 pt-6">
            <img src={LOGO} alt="Fulmar" className="size-16 shrink-0 object-contain" />
            <span className="flex-1 font-display text-xl font-extrabold leading-none text-white">Fulmar</span>
            
            <button
              className={`rounded-lg p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden ${ANNEAU_FOCUS}`}
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
              title="Replier"
            >
              <PanelLeft className="size-5" />
            </button>
          </div>
        ) : (
          // ✅ Modification : Logo et Bouton sur la même ligne avec un peu plus de marge à droite (pr-4)
          <div className="flex items-center justify-between pl-3 pr-5 pt-4">
            <img src={LOGO} alt="Fulmar" className="size-10 shrink-0 object-contain" />
            <button
              type="button"
              onClick={onBasculerRepli}
              className={`rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white ${ANNEAU_FOCUS}`}
              aria-label="Déplier le menu"
              title="Déplier"
            >
              <PanelLeft className="size-5" />
            </button>
          </div>
        )}

        {/* ===== Navigation ===== */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${replie ? 'pt-4' : 'pt-8'}`} aria-label="Menu">
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
              {section.titre && replie && (
                <div className="my-2 flex justify-center">
                  <span className="h-px w-6 bg-white/20" />
                </div>
              )}
              <div className={`px-2 ${replie ? 'space-y-1' : 'space-y-2'}`}>
                {section.entrees.map((entree) => (
                  <Entree
                    key={entree.cle}
                    entree={entree}
                    actif={entree.cle === entreeActive?.cle}
                    badge={entree.badge ? badges[entree.badge] ?? 0 : 0}
                    replie={replie}
                    onClick={onFermer}
                  />
                ))}
              </div>
            </Fragment>
          ))}
        </nav>

        {/* ===== Profil + déconnexion ===== */}
        <div className="border-t border-white/10 px-3 pb-8 pt-3">
          {replie ? (
            <div className="flex flex-col items-center gap-2">
              <NavLink to="/profil" onClick={onFermer} title="Mon compte" className={`rounded-full ${ANNEAU_FOCUS}`}>
                <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
              </NavLink>
              <button
                onClick={() => setConfirmationOuverte(true)}
                className={`rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white ${ANNEAU_FOCUS}`}
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
                onClick={onFermer}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${ANNEAU_FOCUS} ${
                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                  }`
                }
              >
                <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {utilisateur.prenom} {utilisateur.nom}
                  </p>
                  <p className="truncate text-xs text-white/60">{utilisateur.role.libelle}</p>
                </div>
              </NavLink>
              <button
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
