import { useMemo, useState } from 'react'
import { MessageSquare, Search, Users } from 'lucide-react'
import { heureCourte } from '../utils'
import { Avatar } from './ui'

const ETIQUETTES = { GROUPE: 'Groupe', DIFFUSION: 'Diffusion' }

function grouperParPeriode(conversations) {
  const maintenant = new Date()
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const hier = new Date(aujourdHui); hier.setDate(hier.getDate() - 1)
  const il7jours = new Date(aujourdHui); il7jours.setDate(il7jours.getDate() - 7)
  const il30jours = new Date(aujourdHui); il30jours.setDate(il30jours.getDate() - 30)

  const groupes = {
    "Aujourd'hui": [],
    Hier: [],
    'Cette semaine': [],
    'Ce mois': [],
    'Plus ancien': [],
  }

  conversations.forEach((c) => {
    const d = c.derniere_activite ? new Date(c.derniere_activite) : new Date(0)
    const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (jour >= aujourdHui) groupes["Aujourd'hui"].push(c)
    else if (jour >= hier) groupes.Hier.push(c)
    else if (jour >= il7jours) groupes['Cette semaine'].push(c)
    else if (jour >= il30jours) groupes['Ce mois'].push(c)
    else groupes['Plus ancien'].push(c)
  })

  return Object.entries(groupes).filter(([, items]) => items.length > 0)
}

/* Rectangles animés affichés pendant le chargement */
function SqueletteConversations() {
  return (
    <ul aria-hidden="true" className="space-y-0.5 px-2 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="size-10 shrink-0 rounded-full bg-white/80" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 rounded bg-white/80" />
            <div className="h-2.5 w-4/5 rounded bg-white/60" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function ListeConversations({
  conversations,
  selection,
  onSelection,
  utilisateur,
  chargement = false,
}) {
  const [filtre, setFiltre] = useState('')

  const visibles = useMemo(() => {
    const q = filtre.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => (c.titre || '').toLowerCase().includes(q))
  }, [conversations, filtre])

  const groupes = useMemo(() => grouperParPeriode(visibles), [visibles])

  const afficherSquelette = chargement && conversations.length === 0

  return (
    // Teinte verte très pâle, de la même famille que le fond du chat
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-[#F3FAF7] to-[#E0EFE8]">
      {/* Barre de recherche */}
      <div className="border-b border-[#2d5a54]/10 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
            className="w-full rounded-xl border border-white bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-500 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
          />
        </div>
      </div>

      {/* Liste groupée */}
      <div className="defilement-fin min-h-0 flex-1 overflow-y-auto">
        {afficherSquelette && <SqueletteConversations />}

        {!afficherSquelette && visibles.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageSquare className="size-10 text-[#2d5a54]/30" />
            <p className="text-sm text-slate-500">
              {filtre ? 'Aucun résultat pour cette recherche.' : 'Aucune conversation.'}
            </p>
          </div>
        )}

        {groupes.map(([periode, items]) => (
          <section key={periode}>
            {/* Séparateur de période */}
            <div className="sticky top-0 z-10 bg-[#EEF7F3]/85 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#3C6B63] backdrop-blur">
              {periode}
            </div>

            <ul className="space-y-0.5 px-2 pb-2">
              {items.map((c) => {
                const apercu = c.dernier_message ?? (c.derniere_activite ? 'Pièce jointe' : 'Aucun message')
                const autre = c.participants?.find((p) => p.matricule !== utilisateur.matricule)
                const actif = c.reference_conversation === selection
                const estMoi = String(c.dernier_message_expediteur) === String(utilisateur.matricule)
                const nonLus = c.non_lus > 0

                return (
                  <li key={c.reference_conversation}>
                    <button
                      type="button"
                      onClick={() => onSelection(c.reference_conversation)}
                      aria-current={actif ? 'true' : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 ${
                        actif
                          ? 'bg-white shadow-sm ring-1 ring-[#2d5a54]/10'
                          : 'hover:bg-white/60'
                      }`}
                    >
                      {/* Barre d'accent de la conversation active */}
                      {actif && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-3 left-1 w-1 rounded-full bg-piment-600"
                        />
                      )}

                      <Avatar
                        prenom={c.type === 'DIRECT' ? autre?.prenom : c.titre}
                        nom={c.type === 'DIRECT' ? autre?.nom : ''}
                        photoUrl={c.type === 'DIRECT' ? autre?.photo_url : null}
                        taille="md"
                      />

                      <div className="min-w-0 flex-1">
                        {/* Ligne 1 : titre + heure */}
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${nonLus ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                            {c.titre}
                          </span>
                          <span className={`shrink-0 text-[11px] ${nonLus ? 'font-semibold text-piment-600' : 'text-slate-500'}`}>
                            {heureCourte(c.derniere_activite)}
                          </span>
                        </div>

                        {/* Ligne 2 : aperçu + badge non-lus */}
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`flex min-w-0 items-center gap-1 text-xs ${nonLus ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                            {ETIQUETTES[c.type] && (
                              <span className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                {c.type === 'GROUPE' ? <Users className="size-2.5" /> : null}
                                {ETIQUETTES[c.type]}
                              </span>
                            )}
                            {estMoi && c.dernier_message && (
                              <span className="shrink-0 text-slate-500">Vous :</span>
                            )}
                            <span className="truncate">{apercu}</span>
                          </span>

                          {nonLus && (
                            <span
                              className="flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-piment-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
                              aria-label={`${c.non_lus} non lus`}
                            >
                              {c.non_lus > 99 ? '99+' : c.non_lus}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
