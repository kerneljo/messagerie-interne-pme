import { useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../AuthContext'
import useClickDehors from '../useClickDehors'
import { Avatar } from './ui'

export default function MenuUtilisateur() {
  const { utilisateur, deconnexion } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef(null)

  useClickDehors(conteneur, () => setOuvert(false))

  return (
    <div className="relative" ref={conteneur}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
        aria-label="Menu du compte"
        aria-expanded={ouvert}
      >
        <Avatar prenom={utilisateur.prenom} nom={utilisateur.nom} taille="sm" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-800">{utilisateur.prenom} {utilisateur.nom}</span>
          <span className="block text-xs leading-tight text-slate-500">{utilisateur.service.nom_service}</span>
        </span>
        <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
      </button>

      {ouvert && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">{utilisateur.prenom} {utilisateur.nom}</p>
            <p className="truncate text-xs text-slate-500">{utilisateur.email}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[utilisateur.poste, utilisateur.role.libelle, utilisateur.service.nom_service].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            onClick={deconnexion}
            className="flex w-full items-center gap-2 rounded-b-xl px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
