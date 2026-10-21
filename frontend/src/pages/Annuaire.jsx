import { useEffect, useMemo, useRef, useState } from 'react'
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
  Users,
  X,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import useDebounce from '../useDebounce'
import { messageErreur } from '../utils'
import { Avatar, Chargement, EtatVide } from '../components/ui'

const LIMITE = 200
const MIN_RECHERCHE = 2

const MODES = [
  { id: 'service', libelle: 'Par service' },
  { id: 'lettre', libelle: 'A → Z' },
]

/* ============================================================
   Utilitaires
   ============================================================ */
function normaliser(s) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function lettreInitiale(u) {
  const l = normaliser(u.nom).charAt(0).toUpperCase()
  return /[A-Z]/.test(l) ? l : '#'
}

function comparerPersonnes(a, b) {
  return (
    (a.nom ?? '').localeCompare(b.nom ?? '', 'fr') ||
    (a.prenom ?? '').localeCompare(b.prenom ?? '', 'fr')
  )
}

function pluriel(n, mot, motPluriel) {
  return `${n} ${n > 1 ? (motPluriel ?? `${mot}s`) : mot}`
}

/** Surligne le terme recherché (insensible à la casse et aux accents). */
function Surligne({ texte, terme }) {
  const t = (texte ?? '').toString()
  const q = normaliser(terme.trim())
  if (q.length < MIN_RECHERCHE) return t

  const source = normaliser(t)
  // normaliser() conserve la longueur dans la plupart des cas ; on sécurise sinon
  if (source.length !== t.length) return t

  const morceaux = []
  let debut = 0
  let idx = source.indexOf(q)
  while (idx !== -1) {
    if (idx > debut) morceaux.push(t.slice(debut, idx))
    morceaux.push(
      <mark key={idx} className="rounded bg-yellow-200 px-0.5 text-inherit">
        {t.slice(idx, idx + q.length)}
      </mark>
    )
    debut = idx + q.length
    idx = source.indexOf(q, debut)
  }
  if (debut < t.length) morceaux.push(t.slice(debut))
  return morceaux
}

/* ============================================================
   Page
   ============================================================ */
export default function Annuaire() {
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  // Recherche et service sont lus depuis l'URL : lien partageable, retour arrière fonctionnel
  const [recherche, setRecherche] = useState(params.get('q') ?? '')
  const [filtreService, setFiltreService] = useState(params.get('service') ?? '')
  const [mode, setMode] = useState('service')
  const [reduits, setReduits] = useState(() => new Set())

  const [chargement, setChargement] = useState(true)
  const [echecChargement, setEchecChargement] = useState(false)
  const [services, setServices] = useState([])
  const [resultats, setResultats] = useState([])
  const [ouverture, setOuverture] = useState(null) // matricule dont la discussion s'ouvre
  const [erreur, setErreur] = useState('')
  const [rechargement, setRechargement] = useState(0)
  const champRecherche = useRef(null)
  const rechercheDebouncee = useDebounce(recherche, 300)

  // Charge la liste des services une fois
  useEffect(() => {
    api
      .get('/api/annuaire/services')
      .then(({ data }) => setServices(data || []))
      .catch(() => setServices([]))
  }, [])

  // Charge la liste à chaque recherche ou filtre (les anciens résultats restent visibles pendant le chargement)
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

    api
      .get('/api/annuaire', { params: requete })
      .then(({ data }) => {
        if (!annule) setResultats(data || [])
      })
      .catch(() => {
        if (annule) return
        setResultats([])
        setEchecChargement(true)
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })

    return () => {
      annule = true
    }
  }, [rechercheDebouncee, filtreService, rechargement])

  // Synchronise l'URL (sans empiler l'historique)
  useEffect(() => {
    const suivant = new URLSearchParams()
    if (rechercheDebouncee.trim()) suivant.set('q', rechercheDebouncee.trim())
    if (filtreService) suivant.set('service', filtreService)
    setParams(suivant, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercheDebouncee, filtreService])

  // Raccourci clavier : « / » place le curseur dans la recherche
  useEffect(() => {
    function surTouche(e) {
      const cible = e.target
      const saisie = ['INPUT', 'SELECT', 'TEXTAREA'].includes(cible.tagName) || cible.isContentEditable
      if (e.key === '/' && !saisie && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        champRecherche.current?.focus()
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [])

  // Regroupe les résultats (par service ou par initiale), personnes triées par nom
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
  }

  // Ouvre directement la conversation avec la personne (ou rouvre celle qui existe déjà)
  async function ecrire(personne) {
    if (ouverture !== null) return
    setOuverture(personne.matricule)
    setErreur('')
    try {
      const { data } = await api.post(`/api/conversations/ouvrir/${personne.matricule}`)
      // La liste doit connaître la conversation avant qu'on l'ouvre
      await recharger()
      navigate(`/conversations/${data.reference_conversation}`)
    } catch (e) {
      setErreur(messageErreur(e))
      setOuverture(null)
    }
  }

  const aDesFiltres = Boolean(recherche || filtreService)
  const rechercheTropCourte =
    recherche.trim().length > 0 && recherche.trim().length < MIN_RECHERCHE
  const premierChargement = chargement && resultats.length === 0 && !echecChargement

  return (
    <div className="w-full px-3 pb-8 md:px-4">
      {/* ===== Barre d'outils fixe ===== */}
      <div className="sticky top-0 z-10 -mx-3 mb-4 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur md:-mx-4 md:px-4">
        {/* <p className="mb-3 text-sm text-slate-600">
          Trouvez un collègue, consultez sa fiche ou démarrez une conversation en un clic.
        </p> */}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              ref={champRecherche}
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRecherche('')
              }}
              placeholder="Rechercher par nom, prénom, e-mail, poste…   ( / )"
              aria-label="Rechercher un collaborateur"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-500 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
            />
            {recherche && (
              <button
                type="button"
                onClick={() => setRecherche('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-600"
                aria-label="Effacer la recherche"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            value={filtreService}
            onChange={(e) => setFiltreService(e.target.value)}
            aria-label="Filtrer par service"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 lg:w-64"
          >
            <option value="">Tous les services</option>
            {services.map((s) => (
              <option key={s.code_service} value={s.code_service}>
                {s.nom_service} ({s.nb_utilisateurs})
              </option>
            ))}
          </select>

          <div
            role="group"
            aria-label="Mode de regroupement"
            className="inline-flex rounded-xl bg-slate-100 p-1"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                  mode === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.libelle}
              </button>
            ))}
          </div>

          {aDesFiltres && (
            <button
              type="button"
              onClick={effacerFiltres}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Raccourcis par lettre : visibles seulement en mode A → Z */}
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

      {rechercheTropCourte && (
        <p className="mb-4 text-xs text-slate-600">
          Tapez au moins {MIN_RECHERCHE} lettres pour lancer la recherche.
        </p>
      )}

      {erreur && (
        <p
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
          role="alert"
        >
          {erreur}
        </p>
      )}

      {/* ===== Contenu ===== */}
      {premierChargement ? (
        <Chargement />
      ) : echecChargement ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>L’annuaire n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.</span>
          <button
            type="button"
            onClick={() => setRechargement((n) => n + 1)}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      ) : resultats.length === 0 ? (
        <EtatVide icone={Users} titre={aDesFiltres ? 'Aucun résultat' : 'Aucun collaborateur'}>
          {aDesFiltres
            ? 'Essayez un autre nom ou un autre service.'
            : "Aucun autre compte actif n'est enregistré pour le moment."}
        </EtatVide>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p
              className="flex items-center gap-2 text-sm text-slate-600"
              aria-live="polite"
            >
              {pluriel(resultats.length, 'collaborateur')}
              {mode === 'service' && ` · ${pluriel(groupes.length, 'service')}`}
              {chargement && (
                <Loader2 className="size-3.5 animate-spin text-slate-400" aria-label="Mise à jour…" />
              )}
            </p>

            {groupes.length > 1 && (
              <button
                type="button"
                onClick={toutBasculer}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
              >
                {toutReduit ? (
                  <ChevronsUpDown className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronsDownUp className="size-4" aria-hidden="true" />
                )}
                {toutReduit ? 'Tout déplier' : 'Tout replier'}
              </button>
            )}
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
                      <ChevronDown
                        className={`size-4 shrink-0 text-slate-500 transition-transform ${ferme ? '-rotate-90' : ''}`}
                        aria-hidden="true"
                      />
                      {mode === 'service' && (
                        <Building2 className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                      )}
                      <span className="text-sm font-bold text-slate-800">{cle}</span>
                      <span className="text-xs font-normal text-slate-500">
                        {pluriel(membres.length, 'personne')}
                      </span>
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

          {resultats.length >= LIMITE && (
            <p className="mt-6 text-sm text-slate-600">
              Affichage limité aux {LIMITE} premiers résultats. Affinez la recherche pour en voir plus.
            </p>
          )}
        </>
      )}
    </div>
  )
}

/* ============================================================
   Carte utilisateur
   ============================================================ */
function CarteUtilisateur({ utilisateur: u, terme, estMoi, enCours, desactive, onMessage }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      {/* Avatar et nom : lien vers la fiche du collaborateur */}
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
            <Mail className="size-4" aria-hidden="true" />
          </a>
        )}

        {!estMoi && (
          <button
            type="button"
            onClick={onMessage}
            disabled={desactive}
            className="rounded-lg p-2 text-lagon-800 transition hover:bg-lagon-800/10 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            aria-label={`Envoyer un message à ${u.prenom} ${u.nom}`}
            title="Envoyer un message"
          >
            {enCours ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <MessageSquare className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </li>
  )
}