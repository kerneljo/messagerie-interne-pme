import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const TITRES = {
  '/': 'Tableau de bord',
  '/documents': 'Documents',
   '/notifications': 'Notifications',
  '/annuaire': 'Annuaire',
  '/admin': 'Administration',
  '/a-traiter': 'A traiter',
  '/profil': 'Mon profil',
}

function titrePage(chemin) {
  if (chemin.startsWith('/conversations')) {
    return 'Conversations'
  }

  return TITRES[chemin] ?? 'Messagerie interne'
}

export default function Header({ onMenu, refEmplacement }) {
  const { pathname } = useLocation()

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-papier px-4 md:px-6">
      {/* Bouton du menu mobile */}
      <button
        type="button"
        className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-600 lg:hidden"
        onClick={onMenu}
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* Emplacement pour le contenu propre à une page
          (ex. : l'interlocuteur d'une discussion, injecté via un portail).
          Doit rester juste avant le <h1> pour que la classe "peer" fonctionne. */}
      <div ref={refEmplacement} className="peer min-w-0 flex-1 empty:hidden" />

      {/* Titre de la page : masqué visuellement quand l'emplacement est rempli,
          mais conservé pour les lecteurs d'écran */}
      <h1 className="flex-1 truncate text-xl font-bold text-slate-900 peer-[:not(:empty)]:sr-only">
        {titrePage(pathname)}
      </h1>
    </header>
  )
}
