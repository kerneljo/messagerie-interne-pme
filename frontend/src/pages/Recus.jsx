import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Inbox, Loader2, Paperclip, ChevronRight, Plus, Users,
} from 'lucide-react'
import api from '../api'
import { Avatar } from '../components/ui'

const FILTRES = [
  { id: 'tous', label: 'Tous' },
  { id: 'non_lus', label: 'Non lus' },
]

export default function Recus() {
  const navigate = useNavigate()
  const [groupes, setGroupes] = useState([])
  const [stats, setStats] = useState({ total: 0, non_lus: 0 })
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState('tous')

  useEffect(() => {
    setChargement(true)
    api.get('/api/messages/recus')
      .then((r) => {
        setGroupes(r.data.data ?? r.data)
        setStats(r.data.stats ?? { total: 0, non_lus: 0 })
      })
      .catch(() => {
        setGroupes([])
        setStats({ total: 0, non_lus: 0 })
      })
      .finally(() => setChargement(false))
  }, [])

  const visibles = useMemo(() => {
    return groupes.filter((g) => {
      if (recherche && !(g.titre || '').toLowerCase().includes(recherche.toLowerCase())) {
        return false
      }
      if (filtre === 'non_lus' && (g.nb_non_lus ?? 0) === 0) return false
      return true
    })
  }, [groupes, recherche, filtre])

  const groupesParDate = useMemo(() => grouperParPeriode(visibles), [visibles])

  return (
    <div className="w-full px-6 py-6 md:px-8">

      {/* ===== Stats ===== */}
      <p className="mb-4 text-sm text-slate-600">
        {stats.total} message{stats.total > 1 ? 's' : ''}
        {stats.non_lus > 0 && (
          <>
            {' · '}
            <span className="font-semibold text-indigo-600">
              {stats.non_lus} non lu{stats.non_lus > 1 ? 's' : ''}
            </span>
          </>
        )}
      </p>

      {/* ===== Filtres + Recherche ===== */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {FILTRES.map((f) => {
            const actif = filtre === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltre(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                  actif
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
                {f.id === 'non_lus' && stats.non_lus > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    actif ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {stats.non_lus}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les messages reçus…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-16 text-sm
                       placeholder-slate-400
                       focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ===== Liste ===== */}
      <div className="space-y-6">
        {chargement ? (
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Chargement…
            </div>
          </div>
        ) : visibles.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
              <Inbox className="size-6" />
            </span>
            <p className="text-sm font-medium text-slate-700">
              {recherche || filtre !== 'tous' ? 'Aucun résultat' : 'Boîte de réception vide'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {recherche
                ? 'Essayez avec un autre nom.'
                : filtre === 'non_lus'
                  ? 'Vous avez tout lu. 🎉'
                  : 'Vos messages reçus apparaîtront ici.'}
            </p>
          </div>
        ) : (
          groupesParDate.map(({ periode, items }) => (
            <div key={periode}>
              <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {periode}
              </h2>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {items.map((g) => (
                    <LigneGroupe
                      key={g.cle}
                      groupe={g}
                      onClic={() => navigate(`/conversations/${g.reference_conversation}`)}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Ligne d'un groupe (expéditeur ou groupe)
   ============================================================ */
function LigneGroupe({ groupe, onClic }) {
  const aNonLus = (groupe.nb_non_lus ?? 0) > 0
  const expediteur = groupe.expediteur

  return (
    <li>
      <button
        onClick={onClic}
        className={`group w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
          aNonLus ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-slate-50'
        }`}
      >
        {/* Point bleu si non lus */}
        <span className={`size-2 shrink-0 rounded-full transition ${
          aNonLus ? 'bg-indigo-500' : 'bg-transparent'
        }`} />

        {/* Avatar */}
        {groupe.type === 'DIRECT' && expediteur ? (
          <Avatar
            prenom={expediteur.prenom}
            nom={expediteur.nom}
            taille="md"
            photoUrl={expediteur.photo_url}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Users className="size-5" />
          </div>
        )}

        {/* Contenu */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate text-sm ${aNonLus ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
              {groupe.titre}
            </h3>
            {groupe.type !== 'DIRECT' && groupe.participants_count && (
              <span className="truncate text-xs text-slate-500">
                · {groupe.participants_count} participants
              </span>
            )}
          </div>
          <p className={`mt-0.5 truncate text-sm ${aNonLus ? 'text-slate-700' : 'text-slate-600'}`}>
            {groupe.dernier_apercu || 'Pièce jointe'}
          </p>
        </div>

        {/* Métadonnées à droite */}
        <div className="shrink-0 flex items-center gap-3">
          {/* Pièce jointe */}
          {groupe.nb_fichiers > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
              <Paperclip className="size-3" />
              {groupe.nb_fichiers}
            </span>
          )}

          {/* Date */}
          <span className={`text-right text-xs ${aNonLus ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
            {formaterDate(groupe.derniere_date)}
          </span>

          {/* Badge non lus (style Facebook, prioritaire) */}
          {aNonLus && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white shadow-sm">
              {groupe.nb_non_lus > 99 ? '99+' : groupe.nb_non_lus}
            </span>
          )}

          {/* Chevron */}
          <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
        </div>
      </button>
    </li>
  )
}

/* ============================================================
   Groupement par période
   ============================================================ */
function grouperParPeriode(groupes) {
  const maintenant = new Date()
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const hier = new Date(aujourdHui); hier.setDate(hier.getDate() - 1)
  const il7jours = new Date(aujourdHui); il7jours.setDate(il7jours.getDate() - 7)
  const il30jours = new Date(aujourdHui); il30jours.setDate(il30jours.getDate() - 30)

  const buckets = {
    "Aujourd'hui": [],
    'Hier': [],
    'Cette semaine': [],
    'Ce mois': [],
    'Plus tôt': [],
  }

  groupes.forEach((g) => {
    const d = g.derniere_date ? new Date(g.derniere_date) : new Date(0)
    const jour = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    if (jour >= aujourdHui) buckets["Aujourd'hui"].push(g)
    else if (jour >= hier) buckets['Hier'].push(g)
    else if (jour >= il7jours) buckets['Cette semaine'].push(g)
    else if (jour >= il30jours) buckets['Ce mois'].push(g)
    else buckets['Plus tôt'].push(g)
  })

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([periode, items]) => ({ periode, items }))
}

/* ============================================================
   Formatage de date
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
