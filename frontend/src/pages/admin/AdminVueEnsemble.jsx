import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Briefcase,
  Building2,
  Shield,
  ArrowRight,
  Activity,
} from 'lucide-react'
import api from '../../api'

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600 focus-visible:ring-offset-2 focus-visible:ring-offset-papier'

export default function AdminVueEnsemble() {
  const [stats, setStats] = useState(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    // Récupère quelques stats en parallèle (on adaptera quand les endpoints existeront)
    Promise.all([
      api.get('/api/admin/utilisateurs').catch(() => ({ data: [] })),
      api.get('/api/admin/postes').catch(() => ({ data: [] })),
      api.get('/api/admin/services').catch(() => ({ data: [] })),
      api.get('/api/admin/roles').catch(() => ({ data: [] })),
    ])
      .then(([u, p, s, r]) => {
        setStats({
          utilisateurs: Array.isArray(u.data) ? u.data.length : (u.data?.data?.length ?? 0),
          postes: Array.isArray(p.data) ? p.data.length : 0,
          services: Array.isArray(s.data) ? s.data.length : 0,
          roles: Array.isArray(r.data) ? r.data.length : 0,
        })
      })
      .finally(() => setChargement(false))
  }, [])

  /* Pastilles unies et teintées (sans dégradé). blue / indigo / violet suivent le thème ;
     emerald n'est pas redéfini dans index.css, d'où les variantes dark:. */
  const cartes = [
    {
      to: '/admin/utilisateurs',
      icone: Users,
      titre: 'Utilisateurs',
      description: 'Comptes, rôles et statuts',
      valeur: stats?.utilisateurs,
      pastille: 'bg-blue-50 text-blue-700',
    },
    {
      to: '/admin/postes',
      icone: Briefcase,
      titre: 'Postes',
      description: 'Référentiel des postes',
      valeur: stats?.postes,
      pastille: 'bg-indigo-50 text-indigo-700',
    },
    {
      to: '/admin/services',
      icone: Building2,
      titre: 'Services',
      description: 'Départements de l’entreprise',
      valeur: stats?.services,
      pastille: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      to: '/admin/roles',
      icone: Shield,
      titre: 'Rôles',
      description: 'Permissions et accès',
      valeur: stats?.roles,
      pastille: 'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Vue d’ensemble</h2>
        <p className="mt-1 text-sm text-slate-600">
          Accédez rapidement aux différentes sections d’administration.
        </p>
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartes.map(({ to, icone: Icone, titre, description, valeur, pastille }) => (
          <Link
            key={to}
            to={to}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-papier p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-black/5 ${FOCUS}`}
          >
            <div className="mb-4 flex items-start justify-between">
              <span className={`flex size-11 items-center justify-center rounded-xl ${pastille}`}>
                <Icone className="size-5" aria-hidden="true" />
              </span>
              <ArrowRight
                className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              {titre}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {chargement ? '—' : valeur ?? '—'}
            </p>
            <p className="mt-1 text-xs text-slate-600">{description}</p>
          </Link>
        ))}
      </div>

      {/* Activité récente */}
      <div className="rounded-2xl border border-slate-200 bg-papier p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-5 text-slate-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">Activité récente</h3>
        </div>
        <p className="text-sm text-slate-600">
          Le journal d’audit sera affiché ici.{' '}
          <Link
            to="/admin/audit"
            className={`rounded font-medium text-indigo-600 hover:text-indigo-700 ${FOCUS}`}
          >
            Voir tout le journal →
          </Link>
        </p>
      </div>
    </div>
  )
}
