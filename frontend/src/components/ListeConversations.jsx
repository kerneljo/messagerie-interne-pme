import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { heureCourte } from '../utils'
import { Avatar } from './ui'

const ETIQUETTES = { GROUPE: 'Groupe', DIFFUSION: 'Diffusion' }

export default function ListeConversations({ conversations, selection, onSelection, onNouvelle, utilisateur }) {
  const [filtre, setFiltre] = useState('')

  const visibles = conversations.filter((c) =>
    (c.titre || '').toLowerCase().includes(filtre.trim().toLowerCase())
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher une conversation"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>
        <button
          onClick={onNouvelle}
          className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"
          aria-label="Nouveau message"
          title="Nouveau message"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {visibles.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Aucune conversation.</li>}
        {visibles.map((c) => {
          const apercu = c.dernier_message ?? (c.derniere_activite ? 'Pièce jointe' : 'Aucun message')
          const autre = c.participants.find((p) => p.matricule !== utilisateur.matricule)
          const actif = c.reference_conversation === selection
          return (
            <li key={c.reference_conversation}>
              <button
                onClick={() => onSelection(c.reference_conversation)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  actif ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar
                  prenom={c.type === 'DIRECT' ? autre?.prenom : c.titre}
                  nom={c.type === 'DIRECT' ? autre?.nom : ''}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.non_lus > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {c.titre}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{heureCourte(c.derniere_activite)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-slate-500">
                      {ETIQUETTES[c.type] && (
                        <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                          {ETIQUETTES[c.type]}
                        </span>
                      )}
                      {apercu}
                    </span>
                    {c.non_lus > 0 && (
                      <span
                        className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold leading-5 text-white"
                        aria-label={`${c.non_lus} non lus`}
                      >
                        {c.non_lus}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
