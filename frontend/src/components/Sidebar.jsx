import { Fragment, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Contact,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Bell,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ClipboardCheck,
  SquarePen,
  X,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { salleDe } from '../salle'
import { Avatar } from './ui'
import ConfirmationModal from './ConfirmationModal'

const PAS = 58
const HAUTEUR_SEPARATEUR = 44

/*
 * Navigation organisée en sections.
 * - La première section n'a pas de titre.
 * - Les sections avec `reservee: true` ne s'affichent que pour l'administrateur.
 *
 * ORDRE : Tableau de bord en premier, puis Messagerie, puis les autres.
 */
const SECTIONS = [
  {
    cle: 'espace-travail',
    titre: null,
    entrees: [
      { cle: 'dashboard', to: '/', end: true, libelle: 'Tableau de bord', icone: LayoutDashboard },
      { cle: 'conversations', to: '/conversations', libelle: 'Conversations', icone: MessagesSquare, badge: 'messagerie' },
      { cle: 'a-traiter', to: '/a-traiter', libelle: 'À traiter', icone: ClipboardCheck, badge: 'actions' },
      { cle: 'documents', to: '/documents', libelle: 'Documents', icone: FolderOpen }, 
      { cle: 'notifications', to: '/notifications', libelle: 'Notifications', icone: Bell, badge: 'notifications' },
      { cle: 'annuaire', to: '/annuaire', libelle: 'Annuaire', icone: Contact },
    ],
  },
  {
    cle: 'administration',
    titre: 'Système',
    reservee: true,
    entrees: [
      { cle: 'admin', to: '/admin', libelle: 'Administration', icone: ShieldCheck },
    ],
  },
]

// Entrée de navigation correspondant à l'URL (préfixe le plus long), sinon à la salle courante
function trouverEntreeActive(entrees, pathname, salle) {
  let meilleure = null
  for (const e of entrees) {
    const correspond = e.end ? pathname === e.to : pathname === e.to || pathname.startsWith(`${e.to}/`)
    if (correspond && (!meilleure || e.to.length > meilleure.to.length)) meilleure = e
  }
  return meilleure ?? entrees.find((e) => e.cle === salle) ?? null
}

function Logo({ className }) {
  return (
    <svg viewBox="0 0 44 44" className={className} role="img" aria-label="Messagerie interne">
      <rect x="2" y="4" width="26" height="22" rx="9" fill="#d1451f" />
      <path d="M8 26 6 35l10-8Z" fill="#d1451f" />
      <rect x="16" y="14" width="26" height="22" rx="9" fill="#ffc247" />
      <path d="M36 36l3 7-9-7Z" fill="#ffc247" />
    </svg>
  )
}

function Entree({ entree, actif, badge, replie, onClick }) {
  const Icone = entree.icone
  return (
    <NavLink
      to={entree.to}
      end={entree.end}
      onClick={onClick}
      title={replie ? entree.libelle : undefined}
      className={`relative z-10 mb-2.5 ml-3 flex h-12 items-center rounded-l-[22px] text-[15px] font-semibold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-mangue-400 ${
        replie ? 'justify-center px-0' : 'gap-3.5 pl-4 pr-5'
      } ${
        actif
          ? 'text-lagon-950 font-bold'
          : 'text-white hover:bg-white/8'
      }`}
    >
      <Icone className="size-5 shrink-0" />
      {!replie && (
        <>
          <span className="flex-1 truncate">{entree.libelle}</span>
          {badge > 0 && (
            <span
              className={`rounded-full rounded-bl-[4px] px-2 py-0.5 text-xs font-bold ${
                actif
                  ? 'bg-lagon-950/15 text-lagon-950'
                  : 'bg-mangue-400 text-lagon-950'
              }`}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {replie && badge > 0 && (
        <span className="absolute right-3 top-2.5 size-2.5 rounded-full bg-piment-600 ring-2 ring-lagon-950" />
      )}
    </NavLink>
  )
}

export default function Sidebar({ ouvert, onFermer, replie, onBasculerRepli }) {
  const { utilisateur, deconnexion } = useAuth()
  const { conversationsNonLues } = useMessagerie()
  const { pathname } = useLocation()

  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)

  const estAdmin = utilisateur?.role?.libelle === 'Administrateur'
  const salle = salleDe(pathname)

  useEffect(() => {
    document.documentElement.dataset.salle = salle
  }, [salle])

  // Sections visibles selon le rôle
  const sections = SECTIONS.filter((s) => !s.reservee || estAdmin)
  const toutes = sections.flatMap((s) => s.entrees)
  const entreeActive = trouverEntreeActive(toutes, pathname, salle)

  // Position verticale de chaque entrée (pour l'onglet animé)
  const positions = {}
  let y = 0
  for (const section of sections) {
    if (section.titre) y += HAUTEUR_SEPARATEUR
    for (const entree of section.entrees) {
      positions[entree.cle] = y
      y += PAS
    }
  }
  const decalage = entreeActive ? positions[entreeActive.cle] : 0
  const badges = { messagerie: conversationsNonLues.length, notifications: 0 }

  async function confirmerDeconnexion() {
    setDeconnexionEnCours(true)
    try {
      await deconnexion()
      setConfirmationOuverte(false)
    } finally {
      setDeconnexionEnCours(false)
    }
  }

  const IconeRepli = replie ? PanelLeftOpen : PanelLeftClose

  return (
    <>
      {ouvert && (
        <div className="fixed inset-0 z-30 bg-lagon-950/60 lg:hidden" onClick={onFermer} aria-hidden="true" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-lagon-950 transition-all duration-200 lg:static lg:translate-x-0 ${
          replie ? 'w-20' : 'w-64'
        } ${ouvert ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation principale"
      >
        {/* Marque */}
        <div className={`flex items-center ${replie ? 'flex-col gap-3 pb-2 pt-5' : 'gap-3 px-5 pb-1 pt-6'}`}>
          <Logo className={replie ? 'size-10' : 'size-11 shrink-0'} />
          {!replie && (
            <span className="flex-1">
              <span className="block font-display text-xl leading-none font-extrabold text-white">Messagerie</span>
              <span className="mt-1.5 block text-[11px] font-bold tracking-[0.2em] text-mangue-400">INTERNE</span>
            </span>
          )}

          <button
            className="rounded-lg p-1 text-white/70 transition-colors hover:text-white lg:hidden"
            onClick={onFermer}
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>

          <button
            type="button"
            onClick={onBasculerRepli}
            className="hidden rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white lg:flex"
            aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
            title={replie ? 'Déplier' : 'Replier'}
          >
            <IconeRepli className="size-5" />
          </button>
        </div>

        {/* Action principale */}
        <div className={replie ? 'flex justify-center pt-4' : 'px-4 pt-5'}>
          <NavLink
            to="/conversations?nouvelle=1"
            onClick={onFermer}
            title={replie ? 'Nouvelle discussion' : undefined}
            className={`flex items-center justify-center bg-piment-600 font-bold text-white transition-colors hover:bg-piment-700 focus-visible:outline-2 focus-visible:outline-mangue-400 ${
              replie
                ? 'size-12 rounded-[18px_18px_18px_6px]'
                : 'h-[54px] w-full gap-2.5 rounded-[22px_22px_22px_6px] text-[15px]'
            }`}
          >
            <SquarePen className="size-5 shrink-0" />
            {!replie && 'Nouvelle discussion'}
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-7" aria-label="Menu">
          <div className="relative">
            <span
              aria-hidden="true"
              className="onglet motion-reduce:transition-none"
              style={{ transform: `translateY(${decalage}px)`, opacity: entreeActive ? 1 : 0 }}
            />
            {sections.map((section) => (
              <Fragment key={section.cle}>
                {section.titre && (
                  <div className={`flex h-11 items-end pb-3 ${replie ? 'justify-center' : 'px-7'}`}>
                    {replie ? (
                      <span className="h-px w-8 bg-white/25" />
                    ) : (
                      <span className="text-[11px] font-bold tracking-[0.16em] text-white/70 uppercase">
                        {section.titre}
                      </span>
                    )}
                  </div>
                )}
                {section.entrees.map((entree) => (
                  <Entree
                    key={entree.cle}
                    entree={entree}
                    actif={entree.cle === entreeActive?.cle}
                    badge={entree.badge ? badges[entree.badge] : 0}
                    replie={replie}
                    onClick={onFermer}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        </nav>

        {/* Compte et déconnexion */}
        <div className="border-t border-white/10 px-3 pb-5 pt-3">
          {replie ? (
            <div className="flex flex-col items-center gap-2">
              <NavLink to="/profil" onClick={onFermer} title="Mon compte">
                <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
              </NavLink>
              <button
                onClick={() => setConfirmationOuverte(true)}
                className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Se déconnecter"
                title="Se déconnecter"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          ) : (
            <>
              <NavLink
                to="/profil"
                onClick={onFermer}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors ${
                    isActive ? 'bg-white/10' : 'hover:bg-white/5'
                  }`
                }
              >
                <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {utilisateur.prenom} {utilisateur.nom}
                  </p>
                  <p className="truncate text-xs text-white/80">{utilisateur.role.libelle}</p>
                </div>
              </NavLink>
              <button
                onClick={() => setConfirmationOuverte(true)}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="size-5" />
                Se déconnecter
              </button>
            </>
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
