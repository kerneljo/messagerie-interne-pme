import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X, Building2, ChevronDown, Plus, CornerDownLeft, Clock, Users, Globe, Check } from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'
import { Avatar } from './ui'

const MIN_CARACTERES = 2
const DELAI_RECHERCHE = 200

export default function SelecteurDestinataires({ choisis, onChange }) {
  const [q, setQ] = useState('')
  const [codeService, setCodeService] = useState('')
  const [services, setServices] = useState([])
  const [resultatsBruts, setResultatsBruts] = useState([])
  const [suggestions, setSuggestions] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [ouvert, setOuvert] = useState(true)
  const [indexActif, setIndexActif] = useState(0)

  const idListe = useId()
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const rechercheValide = q.trim().length >= MIN_CARACTERES
  const filtreServiceActif = codeService !== ''
  const modeActif = rechercheValide || filtreServiceActif

  // Le panneau est ouvert tant qu'on a pas fermé explicitement
  const panneauOuvert = ouvert

  // Charge les services
  useEffect(() => {
    api.get('/api/annuaire/services')
      .then((r) => setServices(r.data))
      .catch(() => setServices([]))
  }, [])

  // Charge les suggestions (une seule fois)
  useEffect(() => {
    api.get('/api/annuaire/suggestions')
      .then((r) => setSuggestions(r.data))
      .catch(() => setSuggestions({ recents: [], meme_service: [], autres: [] }))
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

  // Recherche
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

  // Liste unifiée pour la navigation clavier
  const listePourNavigation = useMemo(() => {
    if (modeActif) return resultats
    if (!suggestions) return []
    return [
      ...suggestions.recents,
      ...suggestions.meme_service,
      ...suggestions.autres,
    ].filter((p) => !choisis.some((c) => c.matricule === p.matricule))
  }, [modeActif, resultats, suggestions, choisis])

  // Garde l'index actif dans les limites
  useEffect(() => {
    setIndexActif((i) => Math.max(0, Math.min(i, listePourNavigation.length - 1)))
  }, [listePourNavigation.length])

  // Fait défiler jusqu'à l'élément actif
  useEffect(() => {
    if (!panneauOuvert || !listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${indexActif}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [indexActif, panneauOuvert])

  // Sélection multiple (toujours)
  function basculer(p) {
    if (choisis.some((c) => c.matricule === p.matricule)) {
      onChange(choisis.filter((c) => c.matricule !== p.matricule))
    } else {
      onChange([...choisis, p])
    }
  }

  function choisir(p) {
    basculer(p)
    if (!filtreServiceActif) {
      setQ('')
    }
    inputRef.current?.focus()
  }

  function surTouche(e) {
    if (!panneauOuvert) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setOuvert(true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndexActif((i) => Math.min(i + 1, Math.max(listePourNavigation.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndexActif((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (listePourNavigation[indexActif]) choisir(listePourNavigation[indexActif])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOuvert(false)
    } else if (e.key === 'Backspace' && q === '' && choisis.length > 0) {
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

  const listeVisible = panneauOuvert && modeActif && !chargement && resultats.length > 0
  const aucunResultat = modeActif && !chargement && resultats.length === 0 && !erreur

  const suggestionsVisibles =
    panneauOuvert &&
    !modeActif &&
    suggestions &&
    (suggestions.recents.length + suggestions.meme_service.length + suggestions.autres.length) > 0

  let indexGlobal = -1

  return (
    <div ref={containerRef} className="relative">
      {/* Champ + puces + filtre service */}
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
          aria-expanded={listeVisible || suggestionsVisibles}
          aria-controls={idListe}
          aria-autocomplete="list"
          aria-activedescendant={(listeVisible || suggestionsVisibles) ? `${idListe}-${indexActif}` : undefined}
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

      {/* Panneau */}
      {panneauOuvert && (
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
              {resultats.length > 0 && (
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

          {!modeActif && !suggestionsVisibles && (
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

          {aucunResultat && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-800">
                {nbMasques > 0
                  ? 'Toutes les personnes trouvées sont déjà sélectionnées'
                  : rechercheValide
                    ? `Aucun résultat pour « ${q.trim()} »`
                    : 'Aucun collaborateur dans ce service'}
              </p>
            </div>
          )}

          {/* Suggestions */}
          {suggestionsVisibles && (
            <ul
              ref={listRef}
              id={idListe}
              role="listbox"
              aria-label="Suggestions"
              className="max-h-80 divide-y divide-slate-100 overflow-y-auto"
            >
              {suggestions.recents.length > 0 && <SectionSuggestion icone={Clock} titre="Récents" />}
              {suggestions.recents.map((p) => {
                indexGlobal += 1
                const idx = indexGlobal
                const dejaChoisi = choisis.some((c) => c.matricule === p.matricule)
                return (
                  <ItemSuggestion
                    key={`r-${p.matricule}`}
                    personne={p}
                    index={idx}
                    actif={idx === indexActif}
                    dejaChoisi={dejaChoisi}
                    onSelect={() => choisir(p)}
                    onHover={() => setIndexActif(idx)}
                    idListe={idListe}
                  />
                )
              })}

              {suggestions.meme_service.length > 0 && <SectionSuggestion icone={Users} titre="Mon service" />}
              {suggestions.meme_service.map((p) => {
                indexGlobal += 1
                const idx = indexGlobal
                const dejaChoisi = choisis.some((c) => c.matricule === p.matricule)
                return (
                  <ItemSuggestion
                    key={`s-${p.matricule}`}
                    personne={p}
                    index={idx}
                    actif={idx === indexActif}
                    dejaChoisi={dejaChoisi}
                    onSelect={() => choisir(p)}
                    onHover={() => setIndexActif(idx)}
                    idListe={idListe}
                  />
                )
              })}

              {suggestions.autres.length > 0 && <SectionSuggestion icone={Globe} titre="Autres" />}
              {suggestions.autres.map((p) => {
                indexGlobal += 1
                const idx = indexGlobal
                const dejaChoisi = choisis.some((c) => c.matricule === p.matricule)
                return (
                  <ItemSuggestion
                    key={`a-${p.matricule}`}
                    personne={p}
                    index={idx}
                    actif={idx === indexActif}
                    dejaChoisi={dejaChoisi}
                    onSelect={() => choisir(p)}
                    onHover={() => setIndexActif(idx)}
                    idListe={idListe}
                  />
                )
              })}
            </ul>
          )}

          {/* Résultats de recherche */}
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
                aria-multiselectable={true}
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
                        >
                          {actif ? <CornerDownLeft className="size-3.5" /> : <Plus className="size-4" />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
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

function SectionSuggestion({ icone: Icone, titre }) {
  return (
    <li className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 px-4 py-1.5 backdrop-blur-sm">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icone className="size-3" aria-hidden="true" />
        {titre}
      </span>
    </li>
  )
}

function ItemSuggestion({ personne: p, index, actif, dejaChoisi, onSelect, onHover, idListe }) {
  return (
    <li role="presentation" data-index={index}>
      <button
        type="button"
        id={`${idListe}-${index}`}
        role="option"
        aria-selected={actif}
        aria-disabled={dejaChoisi}
        tabIndex={-1}
        onClick={onSelect}
        onMouseEnter={onHover}
        className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          dejaChoisi ? 'opacity-50' : ''
        } ${actif ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
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
            dejaChoisi
              ? 'bg-emerald-100 text-emerald-700'
              : actif
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500'
          }`}
        >
          {dejaChoisi ? <Check className="size-3.5" strokeWidth={3} /> : actif ? <CornerDownLeft className="size-3.5" /> : <Plus className="size-4" />}
        </span>
      </button>
    </li>
  )
}
