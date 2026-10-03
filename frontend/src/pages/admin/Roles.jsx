import { useEffect, useState } from 'react'
import { Shield, Users, Check, X, Info } from 'lucide-react'
import api from '../../api'
import { Chargement, EtatVide } from '../../components/ui'

const STYLES_ROLE = {
  Administrateur: {
    icone: 'bg-violet-100 text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    accent: 'border-violet-200',
  },
  Employe: {
    icone: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    accent: 'border-blue-200',
  },
}

export default function AdminRoles() {
  const [roles, setRoles] = useState([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    api.get('/api/admin/roles')
      .then((r) => setRoles(r.data))
      .catch(() => setRoles([]))
      .finally(() => setChargement(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Rôles et permissions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Les rôles définissent les droits d’accès à l’application.
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="size-4 mt-0.5 shrink-0" />
        <p>
          Les rôles sont définis au niveau de l’application et ne peuvent pas être modifiés
          depuis cette interface. Leur évolution nécessite une intervention technique
          (déploiement).
        </p>
      </div>

      {/* Cartes */}
      {chargement ? (
        <Chargement />
      ) : roles.length === 0 ? (
        <EtatVide icone={Shield} titre="Aucun rôle" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <CarteRole key={role.code_role} role={role} />
          ))}
        </div>
      )}
    </div>
  )
}

function CarteRole({ role }) {
  const style = STYLES_ROLE[role.libelle] || {
    icone: 'bg-slate-100 text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    accent: 'border-slate-200',
  }

  return (
    <div className={`rounded-2xl border bg-white p-6 ${style.accent}`}>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className={`flex size-11 items-center justify-center rounded-xl ${style.icone}`}>
            <Shield className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">{role.libelle}</h3>
            <p className="text-xs text-slate-500">Code #{role.code_role}</p>
          </div>
        </div>

        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}>
          <Users className="size-3" />
          {role.utilisateurs_count ?? 0}
        </span>
      </div>

      {/* Permissions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Permissions
        </p>
        <ul className="space-y-2">
          {(role.permissions ?? []).map((perm, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="size-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{perm}</span>
            </li>
          ))}
          {(role.permissions ?? []).length === 0 && (
            <li className="flex items-center gap-2 text-sm italic text-slate-400">
              <X className="size-4" />
              Aucune permission définie
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
