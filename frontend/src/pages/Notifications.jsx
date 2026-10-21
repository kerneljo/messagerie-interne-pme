import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  Search,
  X,
} from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'

/* ============================================================
   Configuration
   ============================================================ */
const ONGLETS = [
  { id: 'toutes', libelle: 'Toutes', type: null },
  { id: 'action', libelle: 'Actions', type: 'action_requise' },
  { id: 'mention', libelle: 'Mentions', type: 'mention' },
  { id: 'information', libelle: 'Infos', type: 'information' },
]

const TYPES = {
  action_requise: {
    icone: AlertTriangle,
    couleur: 'bg-amber-100 text-amber-700',
    barre: 'bg-amber-500',
    libelle: 'Action requise',
  },
  mention: {
    icone: AtSign,
    couleur: 'bg-indigo-100 text-indigo-700',
    barre: 'bg-indigo-500',
    libelle: 'Mention',
  },
  information: {
    icone: Info,
    couleur: 'bg-sky-100 text-sky-700',
    barre: 'bg-sky-500',
    libelle: 'Information',
  },
  message: {
    icone: MessageSquare,
    couleur: 'bg-slate-100 text-slate-600',
    barre: 'bg-slate-400',
    libelle: 'Message',
  },
}

const TAILLE_PAGE = 50
const INTERVALLE_ACTUALISATION = 60_000

/* ============================================================
   Utilitaires
   ============================================================ */
function formaterDateRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffJ = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffH < 24) return `Il y a ${diffH} h`
  if (diffJ === 1) return 'Hier'
  if (diffJ < 7) return `Il y a ${diffJ} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function dateComplete(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

function grouperParJour(notifications) {
  const aujourdHui = new Date()
  aujourdHui.setHours(0, 0, 0, 0)
  const hier = new Date(aujourdHui)
  hier.setDate(hier.getDate() - 1)

  const groupes = { "Aujourd'hui": [], Hier: [], 'Plus ancien': [] }

  for (const n of notifications) {
    const d = new Date(n.date_creation)
    d.setHours(0, 0, 0, 0)
    if (d >= aujourdHui) groupes["Aujourd'hui"].push(n)
    else if (d >= hier) groupes.Hier.push(n)
    else groupes['Plus ancien'].push(n)
  }

  return Object.entries(groupes).filter(([, items]) => items.length > 0)
}

/* ============================================================
   Page
   ============================================================ */
export default function Notifications() {
  const [onglet, setOnglet] = useState('toutes')
  const [toutes, setToutes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [nonLuesSeulement, setNonLuesSeulement] = useState(false)
  const [limite, setLimite] = useState(TAILLE_PAGE)
  const premierChargement = useRef(true)

  /* ---------- Chargement ---------- */
  const charger = useCallback(async ({ silencieux = false } = {}) => {
    if (!silencieux) setChargement(true)
    try {
      const { data } = await api.get('/api/notifications')
      setToutes(Array.isArray(data) ? data : (data.data ?? []))
      setErreur('')
    } catch (e) {
      if (!silencieux) setToutes([])
      setErreur(messageErreur(e))
    } finally {
      if (!silencieux) setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger().then(() => {
      premierChargement.current = false
    })
  }, [charger])

  /* ---------- Actualisation auto ---------- */
  useEffect(() => {
    const actualiser = () => {
      if (document.visibilityState === 'visible') charger({ silencieux: true })
    }
    const timer = setInterval(actualiser, INTERVALLE_ACTUALISATION)
    document.addEventListener('visibilitychange', actualiser)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', actualiser)
    }
  }, [charger])

  // Revenir en haut de liste quand le filtre change
  useEffect(() => {
    setLimite(TAILLE_PAGE)
  }, [onglet, recherche, nonLuesSeulement])

  /* ---------- Compteurs ---------- */
  const compteurs = useMemo(() => {
    const res = {}
    for (const o of ONGLETS) {
      const liste = o.type ? toutes.filter((n) => n.type === o.type) : toutes
      res[o.id] = { total: liste.length, nonLues: liste.filter((n) => !n.est_lue).length }
    }
    return res
  }, [toutes])

  /* ---------- Filtrage ---------- */
  const filtrees = useMemo(() => {
    const type = ONGLETS.find((o) => o.id === onglet)?.type
    const terme = recherche.trim().toLowerCase()
    return toutes
      .filter((n) => !type || n.type === type)
      .filter((n) => !nonLuesSeulement || !n.est_lue)
      .filter((n) => !terme || (n.extrait ?? '').toLowerCase().includes(terme))
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
  }, [toutes, onglet, recherche, nonLuesSeulement])

  const visibles = filtrees.slice(0, limite)
  const resteAAfficher = filtrees.length - visibles.length

  // Les actions non traitées sont épinglées en haut de l'onglet « Toutes »
  const epinglees = useMemo(
    () =>
      onglet === 'toutes'
        ? visibles.filter((n) => n.type === 'action_requise' && !n.est_lue)
        : [],
    [visibles, onglet]
  )
  const parJour = useMemo(
    () => grouperParJour(visibles.filter((n) => !epinglees.includes(n))),
    [visibles, epinglees]
  )

  const nbNonLues = compteurs.toutes.nonLues
  const filtreActif = recherche.trim() !== '' || nonLuesSeulement

  /* ---------- Actions ---------- */
  async function marquerLue(n) {
    if (n.est_lue) return
    const ref = n.reference_notification
    setEnCours(ref)
    setToutes((actuels) =>
      actuels.map((x) =>
        x.reference_notification === ref
          ? { ...x, est_lue: true, date_lecture: new Date().toISOString() }
          : x
      )
    )
    try {
      await api.post(`/api/notifications/${ref}/lire`)
    } catch (e) {
      setToutes((actuels) =>
        actuels.map((x) =>
          x.reference_notification === ref ? { ...x, est_lue: false, date_lecture: null } : x
        )
      )
      setErreur(messageErreur(e))
    } finally {
      setEnCours(null)
    }
  }

  async function toutMarquerLues() {
    try {
      await api.post('/api/notifications/tout-lire')
      setToutes((actuels) =>
        actuels.map((x) => (x.type === 'action_requise' ? x : { ...x, est_lue: true }))
      )
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  function reinitialiserFiltres() {
    setRecherche('')
    setNonLuesSeulement(false)
  }

  /* ---------- Rendu ---------- */
  return (
    // ✅ Suppression du padding-top
    <div className="w-full pb-24">
      
      {/* En-tête (bouton "Tout marquer comme lu") */}
      {nbNonLues > 0 && (
        <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 md:px-6">
          <button
            type="button"
            onClick={toutMarquerLues}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Tout marquer comme lu
          </button>
        </header>
      )}

      {/* ✅ Barre d'outils sticky collée en haut */}
      <div className="sticky top-0 z-10 mb-5 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div
          role="tablist"
          aria-label="Filtrer les notifications"
          className="inline-flex rounded-xl bg-slate-100 p-1"
        >
          {ONGLETS.map((o) => {
            const actif = onglet === o.id
            const { nonLues } = compteurs[o.id]
            return (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={actif}
                onClick={() => setOnglet(o.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  actif
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {o.libelle}
                {nonLues > 0 && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none ${
                      o.id === 'action' ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                    aria-label={`${nonLues} non lue${nonLues > 1 ? 's' : ''}`}
                  >
                    {nonLues}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative min-w-52 flex-1 md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les notifications"
            aria-label="Rechercher dans les notifications"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche('')}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Effacer la recherche"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={nonLuesSeulement}
            onChange={(e) => setNonLuesSeulement(e.target.checked)}
            className="size-4 rounded border-slate-300 text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
          Non lues seulement
        </label>
      </div>

      {/* Contenu */}
      <div className="px-4 md:px-6">
        {erreur && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
            role="alert"
          >
            <span>{erreur}</span>
            <button
              type="button"
              onClick={() => charger()}
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {chargement ? (
          <div
            className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Chargement des notifications…
          </div>
        ) : filtrees.length === 0 ? (
          <EtatVide
            onglet={onglet}
            filtreActif={filtreActif}
            onReinitialiser={reinitialiserFiltres}
          />
        ) : (
          <div className="space-y-6">
            {epinglees.length > 0 && (
              <Section titre="À traiter" accent={`${epinglees.length}`}>
                {epinglees.map((n) => (
                  <CarteNotification
                    key={n.reference_notification}
                    n={n}
                    enCours={enCours === n.reference_notification}
                    onMarquerLue={() => marquerLue(n)}
                  />
                ))}
              </Section>
            )}

            {parJour.map(([jour, items]) => (
              <Section key={jour} titre={jour}>
                {items.map((n) => (
                  <CarteNotification
                    key={n.reference_notification}
                    n={n}
                    enCours={enCours === n.reference_notification}
                    onMarquerLue={() => marquerLue(n)}
                  />
                ))}
              </Section>
            ))}

            {resteAAfficher > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setLimite((l) => l + TAILLE_PAGE)}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Afficher {Math.min(TAILLE_PAGE, resteAAfficher)} de plus ({resteAAfficher} restantes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Section
   ============================================================ */
function Section({ titre, accent, children }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
        {titre}
        {accent && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {accent}
          </span>
        )}
      </h3>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {children}
      </ul>
    </section>
  )
}

/* ============================================================
   État vide
   ============================================================ */
function EtatVide({ onglet, filtreActif, onReinitialiser }) {
  let titre = 'Aucune notification'
  let detail = 'Vos notifications apparaîtront ici.'

  if (filtreActif) {
    titre = 'Aucun résultat'
    detail = 'Aucune notification ne correspond à votre recherche ou à vos filtres.'
  } else if (onglet !== 'toutes') {
    detail = 'Aucune notification dans cette catégorie.'
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <Bell className="mx-auto size-10 text-slate-400" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{titre}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
      {filtreActif && (
        <button
          type="button"
          onClick={onReinitialiser}
          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  )
}

/* ============================================================
   Carte de notification
   ============================================================ */
function CarteNotification({ n, enCours, onMarquerLue }) {
  const config = TYPES[n.type] ?? TYPES.message
  const Icone = config.icone
  const aLien = Boolean(n.reference_conversation)
  const urgente = n.type === 'action_requise' && !n.est_lue

  const contenu = (
    <div
      className={`relative flex items-center gap-4 px-4 py-3.5 ${
        n.est_lue ? '' : 'bg-lagon-50/40'
      }`}
    >
      {!n.est_lue && (
        <span
          className={`absolute inset-y-0 left-0 w-1 ${config.barre}`}
          aria-hidden="true"
        />
      )}

      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${config.couleur}`}
        aria-hidden="true"
      >
        <Icone className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${config.couleur}`}>
            {config.libelle}
          </span>
          {!n.est_lue && <span className="sr-only">Non lue</span>}
        </div>

        <p
          className={`mt-1 line-clamp-2 text-sm ${
            n.est_lue ? 'text-slate-600' : 'font-semibold text-slate-900'
          }`}
        >
          {n.extrait ?? 'Nouvelle activité'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <time
          dateTime={n.date_creation}
          title={dateComplete(n.date_creation)}
          className="hidden text-xs text-slate-500 sm:block"
        >
          {formaterDateRelative(n.date_creation)}
        </time>

        {urgente && aLien && (
          <span className="hidden rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white md:inline-block">
            Traiter
          </span>
        )}

        {!n.est_lue && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onMarquerLue()
            }}
            disabled={enCours}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            aria-label="Marquer comme lue"
            title="Marquer comme lue"
          >
            {enCours ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
          </button>
        )}

        {aLien && <ChevronRight className="size-4 text-slate-300" aria-hidden="true" />}
      </div>
    </div>
  )

  if (aLien) {
    return (
      <li>
        <Link
          to={`/conversations/${n.reference_conversation}`}
          className="block transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
          onClick={onMarquerLue}
        >
          {contenu}
        </Link>
      </li>
    )
  }

  return <li>{contenu}</li>
}