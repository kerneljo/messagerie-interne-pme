import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import useDebounce from '../useDebounce'
import { messageErreur } from '../utils'
import { Avatar } from '../components/ui'

const LIMITE = 50
const MIN_RECHERCHE = 2
const NB_SERVICES_RAPIDES = 4

const ERREUR_BLOC = 'border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300'
const CONTOUR = 'border-slate-200 dark:border-slate-300'

function normaliser(s) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function lettreInitiale(u) {
  const l = normaliser(u.nom).charAt(0).toUpperCase()
  return /[A-Z]/.test(l) ? l : '#'
}

function comparerPersonnes(a, b) {
  return (a.nom ?? '').localeCompare(b.nom ?? '', 'fr') || (a.prenom ?? '').localeCompare(b.prenom ?? '', 'fr')
}

function pluriel(n, mot, motPluriel) {
  return `${n} ${n > 1 ? (motPluriel ?? `${mot}s`) : mot}`
}

function Surligne({ texte, terme }) {
  const t = (texte ?? '').toString()
  const q = normaliser(terme.trim())
  if (q.length < MIN_RECHERCHE) return t

  const source = normaliser(t)
  if (source.length !== t.length) return t

  const morceaux = []
  let debut = 0
  let idx = source.indexOf(q)
  while (idx !== -1) {
    if (idx > debut) morceaux.push(t.slice(debut, idx))
    morceaux.push(
      <mark key={idx} className="rounded bg-mangue-300/60 px-0.5 font-semibold text-slate-900 dark:bg-mangue-400/30 dark:text-slate-900">
        {t.slice(idx, idx + q.length)}
      </mark>
    )
    debut = idx + q.length
    idx = source.indexOf(q, debut)
  }
  if (debut < t.length) morceaux.push(t.slice(debut))
  return morceaux
}

export default function Annuaire() {
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [recherche, setRecherche] = useState(params.get('q') ?? '')
  const [filtreService, setFiltreService] = useState(params.get('service') ?? '')
  const [mode, setMode] = useState('service')
  const [reduits, setReduits] = useState(() => new Set())
  const [filtresOuverts, setFiltresOuverts] = useState(false)

  const [chargement, setChargement] = useState(true)
  const [chargementPlus, setChargementPlus] = useState(false)
  const [echecChargement, setEchecChargement] = useState(false)
  const [services, setServices] = useState([])
  const [resultats, setResultats] = useState([])
  const [peutPlus, setPeutPlus] = useState(false)
  const [ouverture, setOuverture] = useState(null)
  const [erreur, setErreur] = useState('')
  const [rechargement, setRechargement] = useState(0)

  const champRecherche = useRef(null)
  const sentinelleRef = useRef(null)
  const panneauRef = useRef(null)
  const rechercheDebouncee = useDebounce(recherche, 300)

  useEffect(() => {
    api.get('/api/annuaire/services').then(({ data }) => setServices(data || [])).catch(() => setServices([]))
  }, [])

  useEffect(() => {
    let annule = false
    setChargement(true)
    setEchecChargement(false)

    const terme = rechercheDebouncee.trim()
    const requete = {
      q: terme.length >= MIN_RECHERCHE ? terme : undefined,
      code_service: filtreService || undefined,
      limite: LIMITE,
    }

    api.get('/api/annuaire', { params: requete })
      .then(({ data }) => {
        if (!annule) {
          const liste = data || []
          setResultats(liste)
          setPeutPlus(liste.length >= LIMITE)
        }
      })
      .catch(() => {
        if (annule) return
        setResultats([])
        setPeutPlus(false)
        setEchecChargement(true)
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })

    return () => { annule = true }
  }, [rechercheDebouncee, filtreService, rechargement])

  useEffect(() => {
    const suivant = new URLSearchParams()
    if (rechercheDebouncee.trim()) suivant.set('q', rechercheDebouncee.trim())
    if (filtreService) suivant.set('service', filtreService)
    setParams(suivant, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercheDebouncee, filtreService])

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
      const cible = e.target
      const saisie = ['INPUT', 'SELECT', 'TEXTAREA'].includes(cible.tagName) || cible.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        champRecherche.current?.focus()
      }
      if (e.key === '/' && !saisie && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        champRecherche.current?.focus()
      }
      if (e.key === 'Escape') {
        if (filtresOuverts) setFiltresOuverts(false)
        else if (recherche) setRecherche('')
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [filtresOuverts, recherche])

  const chargerPlus = useCallback(async () => {
    if (chargementPlus || !peutPlus) return
    const dernier = resultats[resultats.length - 1]
    if (!dernier) return

    setChargementPlus(true)
    try {
      const terme = rechercheDebouncee.trim()
      const requete = {
        q: terme.length >= MIN_RECHERCHE ? terme : undefined,
        code_service: filtreService || undefined,
        limite: LIMITE,
        avant: dernier.matricule,
      }
      const { data } = await api.get('/api/annuaire', { params: requete })
      const suite = data || []
      setResultats((actuels) => [...actuels, ...suite])
      setPeutPlus(suite.length >= LIMITE)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setChargementPlus(false)
    }
  }, [chargementPlus, peutPlus, resultats, rechercheDebouncee, filtreService])

  useEffect(() => {
    if (!sentinelleRef.current || !peutPlus) return
    const observateur = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) chargerPlus() },
      { rootMargin: '200px' }
    )
    observateur.observe(sentinelleRef.current)
    return () => observateur.disconnect()
  }, [chargerPlus, peutPlus])

  const groupes = useMemo(() => {
    const map = new Map()
    for (const u of resultats) {
      const cle = mode === 'service' ? u.service || 'Autre' : lettreInitiale(u)
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(u)
    }
    for (const liste of map.values()) liste.sort(comparerPersonnes)
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'fr'))
  }, [resultats, mode])

  const toutReduit = groupes.length > 0 && groupes.every(([cle]) => reduits.has(cle))

  function basculerGroupe(cle) {
    setReduits((actuels) => {
      const suivant = new Set(actuels)
      if (suivant.has(cle)) suivant.delete(cle)
      else suivant.add(cle)
      return suivant
    })
  }

  function toutBasculer() {
    setReduits(toutReduit ? new Set() : new Set(groupes.map(([cle]) => cle)))
  }

  function effacerFiltres() {
    setRecherche('')
    setFiltreService('')
    setMode('service')
  }

  async function ecrire(personne) {
    if (ouverture !== null) return
    setOuverture(personne.matricule)
    setErreur('')
    try {
      const { data } = await api.post(`/api/conversations/ouvrir/${personne.matricule}`)
      await recharger()
      navigate(`/conversations/${data.reference_conversation}`)
    } catch (e) {
      setErreur(messageErreur(e))
      setOuverture(null)
    }
  }

  const aDesFiltres = Boolean(recherche || filtreService)
  const rechercheTropCourte = recherche.trim().length > 0 && recherche.trim().length < MIN_RECHERCHE
  const premierChargement = chargement && resultats.length === 0 && !echecChargement
  const nbFiltresActifs = [filtreService !== ''].filter(Boolean).length
  const servicesRapides = services.slice(0, NB_SERVICES_RAPIDES)

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-papier/95 px-6 py-4 backdrop-blur md:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={champRecherche}
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un collaborateur… (Ctrl+K)"
                aria-label="Rechercher un collaborateur"
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
              {servicesRapides.map((s) => {
                const actif = filtreService === s.code_service
                return (
                  <button
                    key={s.code_service}
                    type="button"
                    onClick={() => setFiltreService(actif ? '' : s.code_service)}
                    className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      actif
                        ? 'border-action-600 bg-action-600 text-white'
                        : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                    }`}
                  >
                    {s.nom_service}
                  </button>
                )
              })}
            </div>

            <div className="relative" ref={panneauRef}>
              <button
                type="button"
                onClick={() => setFiltresOuverts((v) => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  nbFiltresActifs > 0 || mode !== 'service'
                    ? 'border-action-600 bg-action-600/10 text-action-700 dark:bg-action-600/20 dark:text-action-300'
                    : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                }`}
                aria-expanded={filtresOuverts}
              >
                <SlidersHorizontal className="size-3.5" />
                Filtres
                {nbFiltresActifs > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-action-600 text-[10px] font-bold text-white">
                    {nbFiltresActifs}
                  </span>
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
                    className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-papier p-4 shadow-xl dark:border-slate-300"
                  >
                    <div className="mb-4">
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Regroupement
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMode('service')}
                          className={`flex-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            mode === 'service'
                              ? 'border-action-600 bg-action-600 text-white'
                              : `${CONTOUR} bg-papier text-slate-600 hover:bg-slate-50`
                          }`}
                        >
                          Par service
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('lettre')}
                          className={`flex-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                            mode === 'lettre'
                              ? 'border-action-600 bg-action-600 text-white'
                              : `${CONTOUR} bg-papier text-slate-600 hover:bg-slate-50`
                          }`}
                        >
                          A → Z
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Service
                      </label>
                      <select
                        value={filtreService}
                        onChange={(e) => setFiltreService(e.target.value)}
                        className={`w-full rounded-md border ${CONTOUR} bg-papier px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15`}
                      >
                        <option value="">Tous les services</option>
                        {services.map((s) => (
                          <option key={s.code_service} value={s.code_service}>
                            {s.nom_service} ({s.nb_utilisateurs})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-200">
                      <button
                        type="button"
                        onClick={() => { effacerFiltres(); setFiltresOuverts(false) }}
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
              {aDesFiltres && (
                <button
                  type="button"
                  onClick={effacerFiltres}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="size-3.5" />
                  Réinitialiser
                </button>
              )}
              {groupes.length > 1 && (
                <button
                  type="button"
                  onClick={toutBasculer}
                  className={`inline-flex items-center gap-2 rounded-lg border ${CONTOUR} bg-papier px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50`}
                >
                  {toutReduit ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
                  {toutReduit ? 'Tout déplier' : 'Tout replier'}
                </button>
              )}
            </div>
          </div>

          {mode === 'lettre' && groupes.length > 1 && (
            <nav aria-label="Aller à la lettre" className="mt-3 flex flex-wrap gap-1">
              {groupes.map(([lettre]) => (
                <a
                  key={lettre}
                  href={`#lettre-${lettre}`}
                  className="flex size-7 items-center justify-center rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  {lettre}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
        <div className="mx-auto max-w-[1600px]">
          {rechercheTropCourte && (
            <p className="mb-4 text-xs text-slate-600">
              Tapez au moins {MIN_RECHERCHE} lettres pour lancer la recherche.
            </p>
          )}

          {erreur && <p className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${ERREUR_BLOC}`} role="alert">{erreur}</p>}

          {premierChargement ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 className="size-5 animate-spin text-blue-600" />
              Chargement de l'annuaire…
            </div>
          ) : echecChargement ? (
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm ${ERREUR_BLOC}`} role="alert">
              <span>L'annuaire n'a pas pu être chargé.</span>
              <button
                type="button"
                onClick={() => setRechargement((n) => n + 1)}
                className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
              >
                Réessayer
              </button>
            </div>
          ) : resultats.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Users className="size-8" aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-800">
                {aDesFiltres ? 'Aucun résultat' : 'Aucun collaborateur'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {aDesFiltres ? 'Essayez un autre nom ou un autre service.' : "Aucun autre compte actif n'est enregistré pour le moment."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
                  {pluriel(resultats.length, 'collaborateur')}
                  {mode === 'service' && ` · ${pluriel(groupes.length, 'service')}`}
                  {chargement && <Loader2 className="size-3.5 animate-spin text-slate-400" aria-label="Mise à jour…" />}
                </p>
              </div>

              <div className={`space-y-6 transition-opacity ${chargement ? 'opacity-60' : ''}`}>
                {groupes.map(([cle, membres]) => {
                  const ferme = reduits.has(cle)
                  return (
                    <section key={cle} id={mode === 'lettre' ? `lettre-${cle}` : undefined} className="scroll-mt-40">
                      <h3 className="mb-3">
                        <button
                          type="button"
                          onClick={() => basculerGroupe(cle)}
                          aria-expanded={!ferme}
                          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
                        >
                          <ChevronDown className={`size-4 shrink-0 text-slate-500 transition-transform ${ferme ? '-rotate-90' : ''}`} />
                          {mode === 'service' && <Building2 className="size-4 shrink-0 text-slate-500" />}
                          <span className="text-sm font-bold text-slate-800">{cle}</span>
                          <span className="text-xs font-normal text-slate-500">{pluriel(membres.length, 'personne')}</span>
                        </button>
                      </h3>

                      {!ferme && (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                          {membres.map((u) => (
                            <CarteUtilisateur
                              key={u.matricule}
                              utilisateur={u}
                              terme={recherche}
                              estMoi={u.matricule === utilisateur?.matricule}
                              enCours={ouverture === u.matricule}
                              desactive={ouverture !== null}
                              onMessage={() => ecrire(u)}
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  )
                })}
              </div>

              <div ref={sentinelleRef} className="h-4" />

              {chargementPlus && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  Chargement…
                </div>
              )}

              {!peutPlus && resultats.length > 0 && (
                <p className="mt-8 text-center text-xs text-slate-400">— Fin des résultats —</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CarteUtilisateur({ utilisateur: u, terme, estMoi, enCours, desactive, onMessage }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-papier p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <Link
        to={`/utilisateurs/${u.matricule}`}
        aria-label={`Voir la fiche de ${u.prenom} ${u.nom}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Avatar prenom={u.prenom} nom={u.nom} photoUrl={u.photo_url} taille="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">
            <Surligne texte={`${u.prenom} ${u.nom}`} terme={terme} />
            {estMoi && <span className="ml-2 text-xs font-normal text-slate-600">(vous)</span>}
          </span>
          <span className="block truncate text-xs text-slate-600">
            {u.poste ? <Surligne texte={u.poste} terme={terme} /> : '—'}
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        {u.email && (
          <a
            href={`mailto:${u.email}`}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-600"
            aria-label={`Écrire un e-mail à ${u.prenom} ${u.nom}`}
            title={u.email}
          >
            <Mail className="size-4" />
          </a>
        )}
        {!estMoi && (
          <button
            type="button"
            onClick={onMessage}
            disabled={desactive}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-600/10 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            aria-label={`Envoyer un message à ${u.prenom} ${u.nom}`}
            title="Envoyer un message"
          >
            {enCours ? <Loader2 className="size-4 animate-spin" /> : <MessageSquare className="size-4" />}
          </button>
        )}
      </div>
    </li>
  )
}