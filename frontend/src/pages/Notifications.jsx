import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { messageErreur } from '../utils'

const FILTRES_RAPIDES = [
  { id: 'toutes', libelle: 'Toutes', type: null },
  { id: 'action', libelle: 'Actions', type: 'action_requise' },
  { id: 'mention', libelle: 'Mentions', type: 'mention' },
  { id: 'information', libelle: 'Infos', type: 'information' },
]

// ✅ Couleurs thémées : mangue (jaune/orange), blue, indigo, sky
const TYPES = {
  action_requise: {
    icone: AlertTriangle,
    couleur: 'bg-mangue-300/30 text-mangue-500 dark:bg-mangue-400/20 dark:text-mangue-400',
    barre: 'bg-mangue-500',
    libelle: 'Action requise',
  },
  mention: {
    icone: AtSign,
    couleur: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-200 dark:text-indigo-800',
    barre: 'bg-indigo-500',
    libelle: 'Mention',
  },
  information: {
    icone: Info,
    couleur: 'bg-blue-100 text-blue-700 dark:bg-blue-200 dark:text-blue-800',
    barre: 'bg-blue-500',
    libelle: 'Information',
  },
  message: {
    icone: MessageSquare,
    couleur: 'bg-slate-100 text-slate-600 dark:bg-slate-200 dark:text-slate-700',
    barre: 'bg-slate-400',
    libelle: 'Message',
  },
}

const TAILLE_PAGE = 50
const INTERVALLE_ACTUALISATION = 60_000
const CONTOUR = 'border-slate-200 dark:border-slate-300'
const ERREUR_BLOC = 'border border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200'

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
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
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

export default function Notifications() {
  const [onglet, setOnglet] = useState('toutes')
  const [toutes, setToutes] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [nonLuesSeulement, setNonLuesSeulement] = useState(false)
  const [limite, setLimite] = useState(TAILLE_PAGE)
  const [filtresOuverts, setFiltresOuverts] = useState(false)

  const rechercheRef = useRef(null)
  const sentinelleRef = useRef(null)
  const panneauRef = useRef(null)

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
    charger()
  }, [charger])

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

  useEffect(() => {
    setLimite(TAILLE_PAGE)
  }, [onglet, recherche, nonLuesSeulement])

  useEffect(() => {
    function surClicExterieur(e) {
      if (panneauRef.current && !panneauRef.current.contains(e.target)) {
        setFiltresOuverts(false)
      }
    }
    if (filtresOuverts) {
      document.addEventListener('mousedown', surClicExterieur)
      return () => document.removeEventListener('mousedown', surClicExterieur)
    }
  }, [filtresOuverts])

  useEffect(() => {
    function surTouche(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        rechercheRef.current?.focus()
      }
      if (e.key === 'Escape' && filtresOuverts) setFiltresOuverts(false)
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [filtresOuverts])

  const compteurs = useMemo(() => {
    const res = {}
    for (const o of FILTRES_RAPIDES) {
      const liste = o.type ? toutes.filter((n) => n.type === o.type) : toutes
      res[o.id] = { total: liste.length, nonLues: liste.filter((n) => !n.est_lue).length }
    }
    return res
  }, [toutes])

  const filtrees = useMemo(() => {
    const type = FILTRES_RAPIDES.find((o) => o.id === onglet)?.type
    const terme = recherche.trim().toLowerCase()
    return toutes
      .filter((n) => !type || n.type === type)
      .filter((n) => !nonLuesSeulement || !n.est_lue)
      .filter((n) => !terme || (n.extrait ?? '').toLowerCase().includes(terme))
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation))
  }, [toutes, onglet, recherche, nonLuesSeulement])

  const visibles = filtrees.slice(0, limite)
  const resteAAfficher = filtrees.length - visibles.length

  const epinglees = useMemo(
    () => onglet === 'toutes' ? visibles.filter((n) => n.type === 'action_requise' && !n.est_lue) : [],
    [visibles, onglet]
  )
  const parJour = useMemo(
    () => grouperParJour(visibles.filter((n) => !epinglees.includes(n))),
    [visibles, epinglees]
  )

  const nbNonLues = compteurs.toutes.nonLues
  const filtreActif = recherche.trim() !== '' || nonLuesSeulement

  const chargerPlus = useCallback(() => {
    if (resteAAfficher > 0) setLimite((l) => l + TAILLE_PAGE)
  }, [resteAAfficher])

  useEffect(() => {
    if (!sentinelleRef.current || resteAAfficher <= 0) return
    const observateur = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) chargerPlus() },
      { rootMargin: '200px' }
    )
    observateur.observe(sentinelleRef.current)
    return () => observateur.disconnect()
  }, [chargerPlus, resteAAfficher])

  async function marquerLue(n) {
    if (n.est_lue) return
    const ref = n.reference_notification
    setEnCours(ref)
    setToutes((actuels) =>
      actuels.map((x) => x.reference_notification === ref ? { ...x, est_lue: true, date_lecture: new Date().toISOString() } : x)
    )
    try {
      await api.post(`/api/notifications/${ref}/lire`)
    } catch (e) {
      setToutes((actuels) =>
        actuels.map((x) => x.reference_notification === ref ? { ...x, est_lue: false, date_lecture: null } : x)
      )
      setErreur(messageErreur(e))
    } finally {
      setEnCours(null)
    }
  }

  async function toutMarquerLues() {
    try {
      await api.post('/api/notifications/tout-lire')
      setToutes((actuels) => actuels.map((x) => (x.type === 'action_requise' ? x : { ...x, est_lue: true })))
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  function reinitialiserFiltres() {
    setRecherche('')
    setNonLuesSeulement(false)
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-papier/95 px-6 py-4 backdrop-blur md:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={rechercheRef}
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une notification… (Ctrl+K)"
                className={`w-full rounded-lg border ${CONTOUR} bg-papier py-2 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15`}
              />
              {recherche && (
                <button
                  type="button"
                  onClick={() => setRecherche('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Effacer la recherche"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {FILTRES_RAPIDES.map((o) => {
                const actif = onglet === o.id
                const { nonLues } = compteurs[o.id]
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOnglet(o.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      actif
                        ? 'border-action-600 bg-action-600 text-white'
                        : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                    }`}
                  >
                    {o.libelle}
                    {nonLues > 0 && (
                      <span
                        className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none ${
                          actif
                            ? 'bg-white/20 text-white'
                            : o.id === 'action'
                              ? 'bg-mangue-500 text-white'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-400 dark:text-white'
                        }`}
                      >
                        {nonLues}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="relative" ref={panneauRef}>
              <button
                type="button"
                onClick={() => setFiltresOuverts((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  nonLuesSeulement
                    ? 'border-action-600 bg-action-600/10 text-action-700 dark:bg-action-600/20 dark:text-action-300'
                    : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                }`}
                aria-expanded={filtresOuverts}
              >
                <SlidersHorizontal className="size-3.5" />
                Filtres
                {nonLuesSeulement && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-action-600 text-[10px] font-bold text-white">1</span>
                )}
                <ChevronDown className={`size-3.5 transition-transform ${filtresOuverts ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {filtresOuverts && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-papier p-4 shadow-xl dark:border-slate-300"
                  >
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={nonLuesSeulement}
                        onChange={(e) => setNonLuesSeulement(e.target.checked)}
                        className="size-4 rounded border-slate-300 accent-action-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
                      />
                      Non lues seulement
                    </label>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-200">
                      <button
                        type="button"
                        onClick={() => { reinitialiserFiltres(); setFiltresOuverts(false) }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Tout effacer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltresOuverts(false)}
                        className="rounded-md bg-action-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-action-700"
                      >
                        Appliquer
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {filtreActif && (
                <button
                  type="button"
                  onClick={reinitialiserFiltres}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="size-3.5" />
                  Effacer
                </button>
              )}
              {nbNonLues > 0 && (
                <button
                  type="button"
                  onClick={toutMarquerLues}
                  className={`inline-flex items-center gap-2 rounded-lg border ${CONTOUR} bg-papier px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50`}
                >
                  <CheckCheck className="size-4" aria-hidden="true" />
                  Tout marquer comme lu
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        <div className="mx-auto max-w-[1600px]">
          {erreur && (
            <div className={`mb-4 flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ${ERREUR_BLOC}`} role="alert">
              <span>{erreur}</span>
              <button type="button" onClick={() => charger()} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">
                Réessayer
              </button>
            </div>
          )}

          {chargement ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden="true" />
              Chargement des notifications…
            </div>
          ) : filtrees.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Bell className="size-8" aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-800">
                {filtreActif ? 'Aucun résultat' : onglet !== 'toutes' ? 'Aucune notification dans cette catégorie' : 'Aucune notification'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {filtreActif ? 'Aucune notification ne correspond à votre recherche ou à vos filtres.' : 'Vos notifications apparaîtront ici.'}
              </p>
              {filtreActif && (
                <button
                  type="button"
                  onClick={reinitialiserFiltres}
                  className={`mt-4 rounded-lg border ${CONTOUR} px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50`}
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {epinglees.length > 0 && (
                <Section titre="À traiter" accent={`${epinglees.length}`}>
                  {epinglees.map((n) => (
                    <CarteNotification key={n.reference_notification} n={n} enCours={enCours === n.reference_notification} onMarquerLue={() => marquerLue(n)} />
                  ))}
                </Section>
              )}
              {parJour.map(([jour, items]) => (
                <Section key={jour} titre={jour}>
                  {items.map((n) => (
                    <CarteNotification key={n.reference_notification} n={n} enCours={enCours === n.reference_notification} onMarquerLue={() => marquerLue(n)} />
                  ))}
                </Section>
              ))}
              <div ref={sentinelleRef} className="h-4" />
              {resteAAfficher === 0 && filtrees.length > 0 && (
                <p className="mt-8 text-center text-xs text-slate-400">— Fin des notifications —</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ titre, accent, children }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
        {titre}
        {accent && (
          <span className="rounded-full bg-mangue-300/40 px-2 py-0.5 text-xs font-bold text-mangue-500 dark:bg-mangue-400/20 dark:text-mangue-400">
            {accent}
          </span>
        )}
      </h3>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-papier shadow-sm dark:divide-slate-200">
        {children}
      </ul>
    </section>
  )
}

function CarteNotification({ n, enCours, onMarquerLue }) {
  const config = TYPES[n.type] ?? TYPES.message
  const Icone = config.icone
  const aLien = Boolean(n.reference_conversation)
  const urgente = n.type === 'action_requise' && !n.est_lue

  const contenu = (
    <div className={`relative flex items-start gap-4 px-4 py-4 ${n.est_lue ? '' : 'bg-blue-50/50 dark:bg-blue-100/10'}`}>
      {!n.est_lue && (
        <span className={`absolute inset-y-0 left-0 w-1 ${config.barre}`} aria-hidden="true" />
      )}
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${config.couleur}`} aria-hidden="true">
        <Icone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.couleur}`}>
            {config.libelle}
          </span>
          {urgente && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-400/15 dark:text-red-300">
              Prioritaire
            </span>
          )}
          {!n.est_lue && <span className="sr-only">Non lue</span>}
        </div>
        <p className={`mt-2 text-sm leading-relaxed ${n.est_lue ? 'text-slate-600' : 'text-slate-900'}`}>
          {n.extrait ?? 'Nouvelle activité'}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
        <time dateTime={n.date_creation} title={dateComplete(n.date_creation)} className="text-[11px] text-slate-400">
          {formaterDateRelative(n.date_creation)}
        </time>
        <div className="flex items-center gap-2">
          {!n.est_lue && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarquerLue() }}
              disabled={enCours}
              className="flex size-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-papier hover:text-indigo-600 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              aria-label="Marquer comme lue"
              title="Marquer comme lue"
            >
              {enCours ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            </button>
          )}
          {aLien && <ChevronRight className="size-4 text-slate-300 dark:text-slate-400" aria-hidden="true" />}
        </div>
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