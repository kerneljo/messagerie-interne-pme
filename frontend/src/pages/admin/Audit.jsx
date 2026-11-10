import { useEffect, useState } from 'react'
import {
  Search, LogIn, AlertTriangle, UserPlus, UserCog,
  UserCheck, UserX, KeyRound, Briefcase, Building2, Shield,
  ChevronLeft, ChevronRight, Activity, ShieldAlert, ScrollText,
  Flame, AlertOctagon, Info, Bell,
} from 'lucide-react'
import api from '../../api'
import useDebounce from '../../useDebounce'
import { Avatar, Bouton, Chargement, EtatVide } from '../../components/ui'

/* ============================================================
   Mapping action → icône + couleur selon le NIVEAU
   ============================================================ */
const ICONES = {
  LOGIN: LogIn,
  LOGIN_ECHEC: AlertTriangle,
  RESET_MOT_DE_PASSE: KeyRound,
  CREATION_UTILISATEUR: UserPlus,
  MODIF_UTILISATEUR: UserCog,
  ACTIVATION_UTILISATEUR: UserCheck,
  DESACTIVATION_UTILISATEUR: UserX,
  POSTE_CREATION: Briefcase,
  POSTE_MODIFICATION: Briefcase,
  POSTE_SUPPRESSION: Briefcase,
  SERVICE_CREATION: Building2,
  SERVICE_MODIFICATION: Building2,
  SERVICE_SUPPRESSION: Building2,
  ROLE_CREATION: Shield,
  ROLE_MODIFICATION: Shield,
  ROLE_SUPPRESSION: Shield,
}

const LIBELLES = {
  LOGIN: 'Connexion',
  LOGIN_ECHEC: 'Échec de connexion',
  RESET_MOT_DE_PASSE: 'Réinitialisation mot de passe',
  CREATION_UTILISATEUR: 'Création d’utilisateur',
  MODIF_UTILISATEUR: 'Modification d’utilisateur',
  ACTIVATION_UTILISATEUR: 'Activation d’utilisateur',
  DESACTIVATION_UTILISATEUR: 'Désactivation d’utilisateur',
  POSTE_CREATION: 'Création de poste',
  POSTE_MODIFICATION: 'Modification de poste',
  POSTE_SUPPRESSION: 'Suppression de poste',
  SERVICE_CREATION: 'Création de service',
  SERVICE_MODIFICATION: 'Modification de service',
  SERVICE_SUPPRESSION: 'Suppression de service',
  ROLE_CREATION: 'Création de rôle',
  ROLE_MODIFICATION: 'Modification de rôle',
  ROLE_SUPPRESSION: 'Suppression de rôle',
}

/**
 * Styles par niveau — 100% thémés avec variantes dark.
 * 3 = CRITIQUE (rouge) / 4 = ALERTE (orange) / 5 = IMPORTANT (mangue) / 6 = INFO (bleu)
 */
const STYLES_NIVEAU = {
  3: {
    bg: 'bg-red-50/60 dark:bg-red-500/10',
    icone: 'bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-300',
    badge: 'bg-red-600 text-white dark:bg-red-500',
    label: 'CRITIQUE',
  },
  4: {
    bg: 'bg-mangue-300/20 dark:bg-mangue-400/10',
    icone: 'bg-mangue-300/40 text-mangue-500 dark:bg-mangue-400/20 dark:text-mangue-400',
    badge: 'bg-mangue-500 text-white dark:bg-mangue-400',
    label: 'ALERTE',
  },
  5: {
    bg: '',
    icone: 'bg-mangue-300/30 text-mangue-500 dark:bg-mangue-400/15 dark:text-mangue-400',
    badge: 'bg-mangue-300/60 text-mangue-500 dark:bg-mangue-400/20 dark:text-mangue-400',
    label: 'IMPORTANT',
  },
  6: {
    bg: '',
    icone: 'bg-blue-50 text-blue-700 dark:bg-blue-100 dark:text-blue-800',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-100 dark:text-blue-800',
    label: 'INFO',
  },
}

const PERIODES = [
  { value: '24h', label: 'Dernières 24h' },
  { value: '7j', label: '7 derniers jours' },
  { value: '30j', label: '30 derniers jours' },
  { value: 'tout', label: 'Tout' },
]

const CONTOUR = 'border-slate-200 dark:border-slate-300'
const CLASSE_CHAMP =
  'w-full rounded-lg border bg-papier px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'

export default function AdminAudit() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total_30j: 0, connexions_24h: 0, echecs_24h: 0 })
  const [alertes, setAlertes] = useState({ brute_force: [] })
  const [meta, setMeta] = useState({ page: 1, derniere_page: 1, total: 0 })
  const [chargement, setChargement] = useState(true)

  const [recherche, setRecherche] = useState('')
  const [periode, setPeriode] = useState('7j')
  const [inclureConnexions, setInclureConnexions] = useState(false)
  const [page, setPage] = useState(1)

  const rechercheDebouncee = useDebounce(recherche, 300)

  async function charger() {
    setChargement(true)
    try {
      const r = await api.get('/api/admin/journal-audit', {
        params: {
          q: rechercheDebouncee || undefined,
          periode,
          niveau_min: inclureConnexions ? 6 : 5,
          page,
          par_page: 50,
        },
      })
      setLogs(r.data.data)
      setMeta(r.data.meta)
      setStats(r.data.stats)
      setAlertes(r.data.alertes)
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [rechercheDebouncee, periode, inclureConnexions, page])
  useEffect(() => { setPage(1) }, [rechercheDebouncee, periode, inclureConnexions])

  const groupes = regrouperParJour(logs)
  const nbBruteForce = alertes.brute_force?.length ?? 0

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Journal d’audit</h2>
          <p className="mt-1 text-sm text-slate-500">
            Historique des actions techniques et de sécurité.
          </p>
        </div>
      </div>

      {/* Alerte brute force */}
      {nbBruteForce > 0 && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 dark:border-red-500/40 dark:bg-red-500/10">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white dark:bg-red-500">
              <Flame className="size-6" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-red-900 dark:text-red-200">
                  Tentative d’intrusion détectée
                </h3>
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white dark:bg-red-500">
                  {nbBruteForce} IP{nbBruteForce > 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                Une ou plusieurs adresses IP ont effectué plusieurs échecs de connexion consécutifs.
                Cela peut indiquer une attaque par force brute.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {alertes.brute_force.map((a) => (
                  <li key={a.adresse_ip} className="flex items-center gap-2 text-red-800 dark:text-red-300">
                    <AlertOctagon className="size-4" />
                    <span className="font-mono">{a.adresse_ip}</span>
                    <span className="text-red-600 dark:text-red-400">— {a.tentatives} tentatives</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CarteStat
          icone={Activity}
          titre="Actions (30j)"
          valeur={stats.total_30j}
          couleur="from-slate-500 to-slate-600"
        />
        <CarteStat
          icone={LogIn}
          titre="Connexions (24h)"
          valeur={stats.connexions_24h}
          couleur="from-blue-500 to-blue-600"
        />
        <CarteStat
          icone={ShieldAlert}
          titre="Échecs connexion (24h)"
          valeur={stats.echecs_24h}
          couleur={stats.echecs_24h >= 5 ? 'from-red-500 to-red-600' : 'from-mangue-400 to-mangue-500'}
          alerte={stats.echecs_24h >= 5}
        />
      </div>

      {/* Filtres */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className={`${CLASSE_CHAMP} ${CONTOUR} pl-10 pr-4`}
          />
        </div>

        <select
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          className={`${CLASSE_CHAMP} ${CONTOUR}`}
        >
          {PERIODES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        <label className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-papier px-3.5 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-100 ${CONTOUR}`}>
          <input
            type="checkbox"
            checked={inclureConnexions}
            onChange={(e) => setInclureConnexions(e.target.checked)}
            className="rounded border-slate-300 accent-action-600"
          />
          <span className="text-slate-700">Afficher les connexions réussies</span>
        </label>
      </div>

      {/* Info filtrage */}
      {!inclureConnexions && (
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Par défaut, les connexions réussies (niveau INFO) sont masquées pour réduire le bruit.
            Cochez la case ci-dessus pour les afficher.
          </p>
        </div>
      )}

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-papier dark:border-slate-300">
        {chargement ? (
          <Chargement />
        ) : logs.length === 0 ? (
          <EtatVide icone={ScrollText} titre="Aucun événement">
            {recherche
              ? 'Aucun résultat.'
              : 'Aucune action enregistrée pour cette période.'}
          </EtatVide>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-200">
            {groupes.map(({ jour, label, entrees }) => (
              <div key={jour}>
                <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-200 dark:bg-slate-100">
                  {label}
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-200">
                  {entrees.map((log) => (
                    <LigneAudit key={log.reference_audit} log={log} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {meta.derniere_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-300">
            <span>
              {meta.total} événement{meta.total > 1 ? 's' : ''} · page {meta.page} / {meta.derniere_page}
            </span>
            <div className="flex items-center gap-2">
              <Bouton disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)} aria-label="Précédent">
                <ChevronLeft className="size-4" />
              </Bouton>
              <Bouton disabled={meta.page >= meta.derniere_page} onClick={() => setPage(meta.page + 1)} aria-label="Suivant">
                <ChevronRight className="size-4" />
              </Bouton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Ligne d'audit
   ============================================================ */
function LigneAudit({ log }) {
  const Icone = ICONES[log.action] || Activity
  const libelle = LIBELLES[log.action] || log.action
  const style = STYLES_NIVEAU[log.niveau] || STYLES_NIVEAU[6]

  const heure = new Date(log.date_action).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  })

  const u = log.utilisateur

  return (
    <div className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-100 ${style.bg}`}>
      <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-slate-400">
        {heure}
      </span>

      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.icone}`}>
        <Icone className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-slate-900">{libelle}</span>

          {log.niveau <= 4 && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
              {log.brute_force && <Flame className="mr-0.5 inline size-3" />}
              {style.label}
            </span>
          )}

          {log.brute_force && (
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              Force brute suspectée
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {u ? (
            <span className="flex items-center gap-1.5">
              <Avatar prenom={u.prenom} nom={u.nom} taille="sm" />
              <span className="font-medium text-slate-700">{u.prenom} {u.nom}</span>
              <span className="text-slate-400">mat. {u.matricule}</span>
            </span>
          ) : (
            <span className="italic text-slate-400">Utilisateur inconnu</span>
          )}

          {log.details_action && (
            <>
              <span className="text-slate-300">·</span>
              <span className="max-w-md truncate">{log.details_action}</span>
            </>
          )}

          {log.adresse_ip && (
            <>
              <span className="text-slate-300">·</span>
              <span className={`font-mono ${log.brute_force ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                {log.adresse_ip}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CarteStat({ icone: Icone, titre, valeur, couleur, alerte }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border bg-papier p-5 ${
      alerte
        ? 'border-red-300 ring-2 ring-red-100 dark:border-red-500/40 dark:ring-red-500/20'
        : 'border-slate-200 dark:border-slate-300'
    }`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${couleur} text-white shadow-sm`}>
        <Icone className="size-5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titre}</p>
        <p className={`text-2xl font-bold ${alerte ? 'text-red-700 dark:text-red-400' : 'text-slate-900'}`}>
          {valeur}
        </p>
      </div>
    </div>
  )
}

function regrouperParJour(logs) {
  const aujourdHui = new Date()
  aujourdHui.setHours(0, 0, 0, 0)
  const hier = new Date(aujourdHui)
  hier.setDate(hier.getDate() - 1)

  const map = new Map()

  logs.forEach((log) => {
    const date = new Date(log.date_action)
    date.setHours(0, 0, 0, 0)
    const cle = date.getTime()

    if (!map.has(cle)) {
      let label
      if (cle === aujourdHui.getTime()) label = 'Aujourd’hui'
      else if (cle === hier.getTime()) label = 'Hier'
      else label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

      map.set(cle, { jour: cle, label, entrees: [] })
    }
    map.get(cle).entrees.push(log)
  })

  return Array.from(map.values())
}