import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X, Building2, ChevronDown, Plus, CornerDownLeft } from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'
import { Avatar } from './ui'

const MIN_CARACTERES = 2
const DELAI_RECHERCHE = 200

export default function SelecteurDestinataires({ direct, choisis, onChange }) {
  const [q, setQ] = useState('')
  const [codeService, setCodeService] = useState('')
  const [services, setServices] = useState([])
  const [resultatsBruts, setResultatsBruts] = useState([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [indexActif, setIndexActif] = useState(0)

  const idListe = useId()
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const rechercheValide = q.trim().length >= MIN_CARACTERES
  const filtreServiceActif = codeService !== ''
  const modeActif = rechercheValide || filtreServiceActif

  // Charge les services
  useEffect(() => {
    api.get('/api/annuaire/services')
      .then((r) => setServices(r.data))
      .catch(() => setServices([]))
  }, [])

  // Ferme au clic extérieur
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOuvert(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Recherche (les réponses périmées sont ignorées)
  useEffect(() => {
    if (!modeActif) {
      setResultatsBruts([])
      setChargement(false)
      setErreur('')
      return
    }

    let annule = false
    setChargement(true)

    const minuteur = setTimeout(() => {
      const params = {}
      if (filtreServiceActif) {
        params.code_service = codeService
        params.limite = 50
      } else {
        params.q = q.trim()
        params.limite = 20
      }

      api.get('/api/annuaire', { params })
        .then((r) => {
          if (annule) return
          setResultatsBruts(r.data)
          setErreur('')
          setIndexActif(0)
        })
        .catch((e) => {
          if (!annule) setErreur(messageErreur(e))
        })
        .finally(() => {
          if (!annule) setChargement(false)
        })
    }, DELAI_RECHERCHE)

    return () => {
      annule = true
      clearTimeout(minuteur)
    }
  }, [q, codeService, modeActif, filtreServiceActif])

  // Filtre les personnes déjà sélectionnées
  const resultats = useMemo(
    () => resultatsBruts.filter((p) => !choisis.some((c) => c.matricule === p.matricule)),
    [resultatsBruts, choisis]
  )
  const nbMasques = resultatsBruts.length - resultats.length

  // Garde l'index actif dans les limites de la liste
  useEffect(() => {
    setIndexActif((i) => Math.max(0, Math.min(i, resultats.length - 1)))
  }, [resultats.length])

  // Fait défiler jusqu'à l'élément actif
  useEffect(() => {
    if (!ouvert || !listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${indexActif}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [indexActif, ouvert])

  function basculer(p) {
    if (choisis.some((c) => c.matricule === p.matricule)) {
      onChange(choisis.filter((c) => c.matricule !== p.matricule))
    } else {
      onChange(direct ? [p] : [...choisis, p])
    }
  }

  // Choix d'une personne : on se prépare à saisir la suivante
  function choisir(p) {
    basculer(p)
    if (!filtreServiceActif) {
      setQ('')
      setOuvert(false)
    }
    inputRef.current?.focus()
  }

  function surTouche(e) {
    if (!ouvert) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setOuvert(true)
      } else if (e.key === 'Enter') {
        // Évite d'envoyer le formulaire par erreur
        e.preventDefault()
        setOuvert(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndexActif((i) => Math.min(i + 1, Math.max(resultats.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndexActif((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (resultats[indexActif]) choisir(resultats[indexActif])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOuvert(false)
    } else if (e.key === 'Backspace' && q === '' && choisis.length > 0) {
      // Efface la dernière puce quand le champ est vide
      e.preventDefault()
      const dernier = choisis[choisis.length - 1]
      onChange(choisis.filter((c) => c.matricule !== dernier.matricule))
    }
  }

  function toutSelectionner() {
    onChange([...choisis, ...resultats])
  }

  function reinitialiser() {
    setQ('')
    setCodeService('')
    setResultatsBruts([])
    inputRef.current?.focus()
  }

  const listeVisible = ouvert && modeActif && !chargement && resultats.length > 0
  const aucunResultat = modeActif && !chargement && resultats.length === 0 && !erreur

  return (
    <div ref={containerRef} className="relative">
      {/* ===== Champ + puces + filtre service ===== */}
      <div
        className="flex min-h-[44px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-1 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"
        onClick={() => {
          setOuvert(true)
          inputRef.current?.focus()
        }}
      >
        {choisis.map((p) => (
          <span
            key={p.matricule}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-0.5 pl-1 pr-1.5 text-xs text-blue-900"
          >
            <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
            <span className="font-medium">{p.prenom} {p.nom}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); basculer(p) }}
              className="rounded-full p-0.5 text-blue-800 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-700"
              aria-label={`Retirer ${p.prenom} ${p.nom}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={listeVisible}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={listeVisible ? `${idListe}-${indexActif}` : undefined}
          aria-label="Rechercher des destinataires"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (e.target.value) setCodeService('')
            setOuvert(true)
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={surTouche}
          placeholder={choisis.length === 0 ? 'Rechercher un collaborateur…' : 'Ajouter…'}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
        />

        {/* Filtre par service */}
        <div className="relative shrink-0 border-l border-slate-200 pl-2">
          <Building2 className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
          <select
            value={codeService}
            onChange={(e) => {
              setCodeService(e.target.value)
              if (e.target.value) setQ('')
              setOuvert(true)
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Filtrer par service"
            title="Filtrer par service"
            className="cursor-pointer appearance-none rounded-md border-0 bg-transparent py-1 pl-7 pr-6 text-xs text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <option value="">Tous les services</option>
            {services.map((s) => (
              <option key={s.code_service} value={s.code_service}>
                {s.nom_service} ({s.nb_utilisateurs})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Annonce vocale du nombre de résultats */}
      <p className="sr-only" aria-live="polite">
        {modeActif && !chargement
          ? `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`
          : ''}
      </p>

      {/* ===== Panneau de suggestions ===== */}
      {ouvert && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 ring-1 ring-black/5">
          {modeActif && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
              <button
                type="button"
                onClick={reinitialiser}
                className="text-xs font-medium text-slate-700 transition hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                ← Réinitialiser les filtres
              </button>
              {!direct && resultats.length > 0 && (
                <button
                  type="button"
                  onClick={toutSelectionner}
                  className="text-xs font-semibold text-blue-700 transition hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {filtreServiceActif ? 'Ajouter tout le service' : `Tout ajouter (${resultats.length})`}
                </button>
              )}
            </div>
          )}

          {/* Aide : pas encore assez de lettres */}
          {!modeActif && (
            <div className="flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Search className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">Recherchez un collaborateur</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  Tapez <span className="font-semibold">{MIN_CARACTERES} lettres</span> de son nom ou choisissez un <span className="font-semibold">service</span>.
                </p>
              </div>
            </div>
          )}

          {modeActif && chargement && (
            <div className="py-6 text-center text-sm text-slate-600">Recherche en cours…</div>
          )}

          {/* Aucun résultat : on l'annonce au lieu de fermer la liste */}
          {aucunResultat && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-800">
                {nbMasques > 0
                  ? 'Toutes les personnes trouvées sont déjà sélectionnées'
                  : rechercheValide
                    ? `Aucun résultat pour « ${q.trim()} »`
                    : 'Aucun collaborateur dans ce service'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {nbMasques > 0 ? 'Retirez une puce pour la proposer à nouveau.' : 'Vérifiez l\u2019orthographe ou essayez un autre service.'}
              </p>
            </div>
          )}

          {listeVisible && (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs">
                <span className="text-slate-700">
                  {resultats.length} résultat{resultats.length > 1 ? 's' : ''}
                  {nbMasques > 0 && (
                    <span className="ml-1 text-slate-600">
                      · {nbMasques} déjà sélectionné{nbMasques > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                {choisis.length > 0 && (
                  <span className="font-semibold text-blue-700">
                    {choisis.length} sélectionné{choisis.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <ul
                ref={listRef}
                id={idListe}
                role="listbox"
                aria-label="Résultats de la recherche"
                aria-multiselectable={!direct}
                className="max-h-72 divide-y divide-slate-100 overflow-y-auto"
              >
                {resultats.map((p, idx) => {
                  const actif = idx === indexActif
                  return (
                    <li key={p.matricule} role="presentation" data-index={idx}>
                      <button
                        type="button"
                        id={`${idListe}-${idx}`}
                        role="option"
                        aria-selected={actif}
                        tabIndex={-1}
                        onClick={() => choisir(p)}
                        onMouseEnter={() => setIndexActif(idx)}
                        className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          actif ? 'bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="block truncate text-xs text-slate-600">
                            {[p.poste, p.service].filter(Boolean).join(' · ') || p.email}
                          </span>
                        </span>
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-md transition ${
                            actif ? 'bg-blue-100 text-blue-700' : 'text-slate-500'
                          }`}
                          aria-hidden="true"
                        >
                          {actif ? <CornerDownLeft className="size-3.5" /> : <Plus className="size-4" />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Aide clavier */}
              <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-sans text-[10px]">↑↓</kbd>
                  naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-sans text-[10px]">Entrée</kbd>
                  sélectionner
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-sans text-[10px]">Échap</kbd>
                  fermer
                </span>
              </div>
            </>
          )}

          {erreur && (
            <p className="px-4 py-3 text-sm text-red-700" role="alert">{erreur}</p>
          )}
        </div>
      )}
    </div>
  )
}
