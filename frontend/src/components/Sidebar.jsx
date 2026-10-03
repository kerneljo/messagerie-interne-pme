import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  MessageSquareText,
  SendHorizontal,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import { Avatar } from './ui'
import ConfirmationModal from './ConfirmationModal'

function Lien({ to, icone: Icone, libelle, end, badge, onClick, replie }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      title={replie ? libelle : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
          replie ? 'justify-center px-2' : 'px-3'
        } ${
          isActive
            ? 'bg-slate-800 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-r-full before:bg-indigo-500'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
        }`
      }
    >
      <Icone className="size-5 shrink-0" />
      {!replie && (
        <>
          <span className="flex-1">{libelle}</span>
          {badge > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {replie && badge > 0 && (
        <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-slate-900" />
      )}
    </NavLink>
  )
}

export default function Sidebar({ ouvert, onFermer, replie, onBasculerRepli }) {
  const { utilisateur, deconnexion } = useAuth()
  const { nonLus, conversationsNonLues } = useMessagerie()

  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)

  const estAdmin = utilisateur?.role?.libelle === 'Administrateur'

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
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onFermer}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-slate-900 transition-all duration-200 lg:static lg:translate-x-0 ${
          replie ? 'w-20' : 'w-64'
        } ${ouvert ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigation principale"
      >
        <div className={`flex h-16 items-center ${replie ? 'justify-center px-0' : 'gap-3 px-5'}`}>
          {!replie && (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                <MessageSquareText className="size-5" />
              </span>
              <span className="flex-1 font-semibold text-white">Messagerie interne</span>
            </>
          )}

          <button
            className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white lg:hidden"
            onClick={onFermer}
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>

          <button
            type="button"
            onClick={onBasculerRepli}
            className="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white lg:flex"
            aria-label={replie ? 'Déplier la sidebar' : 'Replier la sidebar'}
            title={replie ? 'Déplier' : 'Replier'}
          >
            <IconeRepli className="size-5" />
          </button>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto py-3 ${replie ? 'px-2' : 'px-3'}`}>
          <Lien to="/" end icone={LayoutDashboard} libelle="Dashboard" onClick={onFermer} replie={replie} />
          <Lien to="/recus" icone={Inbox} libelle="Boîte de réception" badge={nonLus} onClick={onFermer} replie={replie} />
          <Lien to="/envoyes" icone={SendHorizontal} libelle="Envoyés" onClick={onFermer} replie={replie} />
          <Lien
            to="/conversations"
            icone={MessagesSquare}
            libelle="Conversations"
            badge={conversationsNonLues.length}
            onClick={onFermer}
            replie={replie}
          />

          {estAdmin && (
            <>
              {!replie && (
                <p className="px-3 pt-4 pb-2 text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                  Système
                </p>
              )}
              {replie && <div className="my-2 border-t border-slate-800" />}
              <Lien
                to="/admin"
                icone={ShieldCheck}
                libelle="Administration"
                onClick={onFermer}
                replie={replie}
              />
            </>
          )}
        </nav>

        <div className="border-t border-slate-800 p-3">
          {replie ? (
            <div className="flex flex-col items-center gap-2">
             <NavLink to="/profil" onClick={onFermer} title="Mon profil">
  <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
</NavLink>
              <button
                onClick={() => setConfirmationOuverte(true)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
                aria-label="Déconnexion"
                title="Déconnexion"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          ) : (
            <>
             <NavLink
  to="/profil"
  onClick={onFermer}
  title={replie ? 'Mon profil' : undefined}
  className={({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
      isActive ? 'bg-slate-800' : 'hover:bg-slate-800/60'
    }`
  }
>
  <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" photoUrl={utilisateur.photo_url} />
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium text-white">
      {utilisateur.prenom} {utilisateur.nom}
    </p>
    <p className="truncate text-xs text-slate-400">{utilisateur.role.libelle}</p>
  </div>
</NavLink>
              <button
                onClick={() => setConfirmationOuverte(true)}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-white"
              >
                <LogOut className="size-5" />
                Déconnexion
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
