import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
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

export default function Annuaire() {
  const { utilisateur } = useAuth()
  const { recharger } = useMessagerie()
  const navigate = useNavigate()

  const [chargement, setChargement] = useState(true)
  const [echecChargement, setEchecChargement] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [filtreService, setFiltreService] = useState('')
  const [services, setServices] = useState([])
  const [resultats, setResultats] = useState([])
  const [ouverture, setOuverture] = useState(null) // matricule dont la discussion s'ouvre
  const [erreur, setErreur] = useState('')
  const rechercheDebouncee = useDebounce(recherche, 300)

  // Charge la liste des services une fois
  useEffect(() => {
    api
      .get('/api/annuaire/services')
      .then(({ data }) => setServices(data || []))
      .catch(() => setServices([]))
  }, [])

  // Charge la liste dès l'arrivée sur la page, puis à chaque recherche ou filtre
  useEffect(() => {
    let annule = false
    setChargement(true)
    setEchecChargement(false)

    const terme = rechercheDebouncee.trim()
    const params = {
      q: terme.length >= MIN_RECHERCHE ? terme : undefined,
      code_service: filtreService || undefined,
      limite: LIMITE,
    }

    api
      .get('/api/annuaire', { params })
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
  }, [rechercheDebouncee, filtreService])

  // Groupe les résultats par service
  const groupes = useMemo(() => {
    const map = new Map()
    for (const u of resultats) {
      const cle = u.service || 'Autre'
      if (!map.has(cle)) map.set(cle, [])
      map.get(cle).push(u)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [resultats])

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

  const aDesFiltres = recherche || filtreService
  const rechercheTropCourte =
    recherche.trim().length > 0 && recherche.trim().length < MIN_RECHERCHE

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <p className="mb-6 text-sm text-slate-600">
        Trouvez un collègue, consultez sa fiche ou démarrez une conversation en un clic.
      </p>

      {/* ===== Filtres ===== */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, prénom, e-mail, poste…"
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
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 sm:w-64"
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.code_service} value={s.code_service}>
              {s.nom_service} ({s.nb_utilisateurs})
            </option>
          ))}
        </select>

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
      {chargement ? (
        <Chargement />
      ) : echecChargement ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          L’annuaire n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.
        </p>
      ) : resultats.length === 0 ? (
        <EtatVide icone={Users} titre={aDesFiltres ? 'Aucun résultat' : 'Aucun collaborateur'}>
          {aDesFiltres
            ? 'Essayez un autre nom ou un autre service.'
            : "Aucun autre compte actif n'est enregistré pour le moment."}
        </EtatVide>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600" aria-live="polite">
            {resultats.length} {resultats.length > 1 ? 'collaborateurs' : 'collaborateur'}
          </p>

          <div className="space-y-6">
            {groupes.map(([service, membres]) => (
              <section key={service}>
                <header className="mb-3 flex items-center gap-2">
                  <Building2 className="size-4 text-slate-500" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {service}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {membres.length} {membres.length > 1 ? 'personnes' : 'personne'}
                  </span>
                </header>

                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {membres.map((u) => (
                    <CarteUtilisateur
                      key={u.matricule}
                      utilisateur={u}
                      estMoi={u.matricule === utilisateur?.matricule}
                      enCours={ouverture === u.matricule}
                      desactive={ouverture !== null}
                      onMessage={() => ecrire(u)}
                    />
                  ))}
                </ul>
              </section>
            ))}
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
function CarteUtilisateur({ utilisateur: u, estMoi, enCours, desactive, onMessage }) {
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
            {u.prenom} {u.nom}
            {estMoi && <span className="ml-2 text-xs font-normal text-slate-600">(vous)</span>}
          </span>
          <span className="block truncate text-xs text-slate-600">{u.poste || '—'}</span>
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
