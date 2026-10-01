import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import NotificationsMenu from './NotificationsMenu'

const TITRES = {
  '/': 'Tableau de bord',
  '/recus': 'Boîte de réception',
  '/envoyes': 'Messages envoyés',
  '/envoyer': 'Nouveau message',
}

function titrePage(chemin) {
  if (chemin.startsWith('/conversations')) return 'Conversations'
  return TITRES[chemin] ?? 'Messagerie interne'
}

export default function Header({ onMenu }) {
  const { pathname } = useLocation()

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:px-6">
      <button
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenu}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="flex-1 truncate text-lg font-semibold text-slate-800">{titrePage(pathname)}</h1>

      <NotificationsMenu />
    </header>
  )
}
