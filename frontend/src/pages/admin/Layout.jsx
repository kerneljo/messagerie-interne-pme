import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  Shield,
  ScrollText,
} from 'lucide-react'

const ONGLETS = [
  { to: '/admin', end: true, icone: LayoutDashboard, libelle: 'Vue d’ensemble' },
  { to: '/admin/utilisateurs', icone: Users, libelle: 'Utilisateurs' },
  { to: '/admin/postes', icone: Briefcase, libelle: 'Postes' },
  { to: '/admin/services', icone: Building2, libelle: 'Services' },
  { to: '/admin/roles', icone: Shield, libelle: 'Rôles' },
  { to: '/admin/audit', icone: ScrollText, libelle: 'Journal d’audit' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-full">
      {/* En-tête */}
      <div className="border-b border-slate-200 bg-white">
        <div className="px-6 pt-8 pb-0 sm:px-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Shield className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
              <p className="text-sm text-slate-500">
                Gérez les utilisateurs, les référentiels et la sécurité.
              </p>
            </div>
          </div>

          {/* Onglets */}
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Sections d'administration">
            {ONGLETS.map(({ to, end, icone: Icone, libelle }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Icone className="size-4" />
                {libelle}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu de l'onglet actif */}
      <div className="px-6 py-8 sm:px-8">
        <Outlet />
      </div>
    </div>
  )
}
