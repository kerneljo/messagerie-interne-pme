import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SendHorizontal, Users, Loader2, Paperclip } from 'lucide-react'
import api from '../api'
import { Avatar } from '../components/ui'

export default function Envoyes() {
  const navigate = useNavigate()
  const [groupes, setGroupes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    setChargement(true)
    api.get('/api/messages/envoyes')
      .then((r) => setGroupes(r.data.data ?? r.data))
      .catch(() => setGroupes([]))
      .finally(() => setChargement(false))
  }, [])

  const visibles = groupes.filter((g) => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return (g.titre || '').toLowerCase().includes(q)
  })

  return (
    <div className="w-full px-6 py-6 md:px-8">

      {/* Recherche */}
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les messages envoyés…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm
                       placeholder-slate-400 shadow-sm
                       focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" />
            Chargement…
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <SendHorizontal className="size-6" />
            </span>
            <p className="text-sm font-medium text-slate-700">
              {recherche ? 'Aucun résultat' : 'Aucun message envoyé'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {recherche
                ? 'Essayez avec un autre nom.'
                : 'Vos messages envoyés apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibles.map((g) => (
              <li key={g.cle}>
                <button
                  onClick={() => navigate(`/conversations/${g.reference_conversation}`)}
                  className="group w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* Avatar */}
                  {g.type === 'DIRECT' && g.destinataire ? (
                    <Avatar
                      prenom={g.destinataire.prenom}
                      nom={g.destinataire.nom}
                      taille="md"
                      photoUrl={g.destinataire.photo_url}
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                      <Users className="size-5" />
                    </div>
                  )}

                  {/* Contenu principal */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        À : {g.titre}
                      </h3>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formaterDate(g.derniere_date)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {g.dernier_apercu || 'Pièce jointe'}
                    </p>
                  </div>

                  {/* Compteurs à droite */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {g.nb_messages} message{g.nb_messages > 1 ? 's' : ''}
                    </span>
                    {g.nb_fichiers > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                        <Paperclip className="size-2.5" />
                        {g.nb_fichiers}
                      </span>
                    )}
                    {g.type === 'GROUPE' && (
                      <span className="text-[10px] text-slate-400">
                        {g.participants_count} participants
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Formatage de date intelligent (style Gmail)
   ============================================================ */
function formaterDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''

  const maintenant = new Date()
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const dateMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffJours = Math.floor((aujourdHui - dateMsg) / 86400000)

  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (diffJours === 0) return heure
  if (diffJours === 1) return 'Hier'
  if (diffJours < 7) return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()]
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
