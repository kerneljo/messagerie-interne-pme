import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'
import { Avatar, Bouton } from './ui'

/** Recherche dans l'annuaire (par nom, prénom ou service) et sélection d'un ou plusieurs destinataires. */
export default function SelecteurDestinataires({ direct, choisis, onChange }) {
  const [q, setQ] = useState('')
  const [resultats, setResultats] = useState([])
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const minuteur = setTimeout(() => {
      api
        .get('/api/annuaire', { params: { q, limite: 100 } })
        .then((r) => {
          setResultats(r.data)
          setErreur('')
        })
        .catch((e) => setErreur(messageErreur(e)))
    }, 250)
    return () => clearTimeout(minuteur)
  }, [q])

  const estChoisi = (p) => choisis.some((c) => c.matricule === p.matricule)

  function basculer(p) {
    if (estChoisi(p)) onChange(choisis.filter((c) => c.matricule !== p.matricule))
    else onChange(direct ? [p] : [...choisis, p])
  }

  function toutSelectionner() {
    onChange([...choisis, ...resultats.filter((p) => !estChoisi(p))])
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={direct ? 'Rechercher un collègue...' : 'Rechercher par nom ou par service...'}
          aria-label="Rechercher des destinataires"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
        />
      </div>

      {choisis.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {choisis.map((p) => (
            <button
              key={p.matricule}
              type="button"
              onClick={() => basculer(p)}
              className="flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-2 text-sm text-blue-700 hover:bg-blue-100"
              aria-label={`Retirer ${p.prenom} ${p.nom}`}
            >
              {p.prenom} {p.nom}
              <X className="size-3.5" />
            </button>
          ))}
        </div>
      )}

      {!direct && resultats.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {choisis.length} sélectionné{choisis.length > 1 ? 's' : ''}
          </span>
          <Bouton variante="fantome" className="px-2 py-1 text-xs" onClick={toutSelectionner}>
            Tout sélectionner ({resultats.length})
          </Bouton>
        </div>
      )}

      {erreur && <p className="text-sm text-red-600" role="alert">{erreur}</p>}

      <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        {resultats.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Aucun résultat.</li>}
        {resultats.map((p) => (
          <li key={p.matricule}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
              <input
                type={direct ? 'radio' : 'checkbox'}
                name="destinataire"
                checked={estChoisi(p)}
                onChange={() => basculer(p)}
                className="size-4 accent-blue-600"
              />
              <Avatar prenom={p.prenom} nom={p.nom} taille="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{p.prenom} {p.nom}</span>
                <span className="block truncate text-xs text-slate-500">{[p.poste, p.service].filter(Boolean).join(' · ')}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
