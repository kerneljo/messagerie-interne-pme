import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, Plus, Search, Users } from 'lucide-react'
import { heureCourte } from '../utils'
import { Avatar } from './ui'

const ETIQUETTES = { GROUPE: 'Groupe' }

function grouperParPeriode(conversations) {
  const maintenant = new Date()
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const hier = new Date(aujourdHui); hier.setDate(hier.getDate() - 1)
  const il7jours = new Date(aujourdHui); il7jours.setDate(il7jours.getDate() - 7)
  const il30jours = new Date(aujourdHui); il30jours.setDate(il30jours.getDate() - 30)

  const groupes = {
    "Aujourd'hui": [],
    'Hier': [],
    'Cette semaine': [],
    'Ce mois': [],
    'Plus ancien': [],
  }

  conversations.forEach((c) => {
    const d = c.derniere_activite ? new Date(c.derniere_activite) : new Date(0)
    const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (jour >= aujourdHui) groupes["Aujourd'hui"].push(c)
    else if (jour >= hier) groupes['Hier'].push(c)
    else if (jour >= il7jours) groupes['Cette semaine'].push(c)
    else if (jour >= il30jours) groupes['Ce mois'].push(c)
    else groupes['Plus ancien'].push(c)
  })

  return Object.entries(groupes).filter(([, items]) => items.length > 0)
}

export default function ListeConversations({
  conversations,
  selection,
  onSelection,
  onNouvelle,
  onNouveauGroupe,
  utilisateur,
}) {
  const [filtre, setFiltre] = useState('')
  const [menuOuvert, setMenuOuvert] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOuvert) return
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOuvert(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOuvert])

  const visibles = conversations.filter((c) =>
    (c.titre || '').toLowerCase().includes(filtre.trim().toLowerCase())
  )

  const groupes = useMemo(() => grouperParPeriode(visibles), [visibles])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Barre recherche + bouton + */}
      <div className="flex items-center gap-2 border-b border-slate-200 p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition"
            aria-label="Nouveau"
            title="Nouveau"
            aria-expanded={menuOuvert}
          >
            <Plus className="size-5" />
          </button>

          {menuOuvert && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 z-50 overflow-hidden">
              <button
                onClick={() => { setMenuOuvert(false); onNouvelle?.() }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                  <MessageSquare className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Nouveau message</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Direct ou envoi multiple
                  </p>
                </div>
              </button>

              <div className="border-t border-slate-100"></div>

              <button
                onClick={() => { setMenuOuvert(false); onNouveauGroupe?.() }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition text-left"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 mt-0.5">
                  <Users className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Nouveau groupe</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Discussion à 3+ personnes
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Liste groupée */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibles.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">Aucune conversation.</p>
        )}

        {groupes.map(([periode, items]) => (
          <div key={periode}>
            {/* Séparateur de date */}
            <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              {periode}
            </div>

            <ul className="divide-y divide-slate-100">
              {items.map((c) => {
                const apercu = c.dernier_message ?? (c.derniere_activite ? 'Pièce jointe' : 'Aucun message')
                const autre = c.participants.find((p) => p.matricule !== utilisateur.matricule)
                const actif = c.reference_conversation === selection
                const estMoi = String(c.dernier_message_expediteur) === String(utilisateur.matricule)

                return (
                  <li key={c.reference_conversation}>
                    <button
                      onClick={() => onSelection(c.reference_conversation)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        actif ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Avatar
                        prenom={c.type === 'DIRECT' ? autre?.prenom : c.titre}
                        nom={c.type === 'DIRECT' ? autre?.nom : ''}
                        photoUrl={c.type === 'DIRECT' ? autre?.photo_url : null}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-sm ${c.non_lus > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {c.titre}
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {heureCourte(c.derniere_activite)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">
                            {ETIQUETTES[c.type] && (
                              <span className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                                {ETIQUETTES[c.type]}
                              </span>
                            )}
                            {estMoi && c.dernier_message && (
                              <span className="text-slate-400">Vous : </span>
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
        ))}
      </div>
    </div>
  )
}
