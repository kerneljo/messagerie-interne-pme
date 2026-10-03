import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Building2, ChevronDown, Plus, CornerDownLeft } from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'
import { Avatar } from './ui'

export default function SelecteurDestinataires({ direct, choisis, onChange }) {
  const [q, setQ] = useState('')
  const [codeService, setCodeService] = useState('')
  const [services, setServices] = useState([])
  const [resultatsBruts, setResultatsBruts] = useState([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [indexActif, setIndexActif] = useState(0)

  const containerRef = useRef(null)
  const listRef = useRef(null)
  const rechercheValide = q.trim().length >= 2
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

  // Recherche
  useEffect(() => {
    if (!modeActif) {
      setResultatsBruts([])
      setChargement(false)
      return
    }

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
          setResultatsBruts(r.data)
          setErreur('')
          setIndexActif(0)
        })
        .catch((e) => setErreur(messageErreur(e)))
        .finally(() => setChargement(false))
    }, 300)

    return () => clearTimeout(minuteur)
  }, [q, codeService, modeActif, filtreServiceActif])

  // Filtre les utilisateurs déjà sélectionnés
  const resultats = useMemo(
    () => resultatsBruts.filter((p) => !choisis.some((c) => c.matricule === p.matricule)),
    [resultatsBruts, choisis]
  )

  // Auto-fermeture si plus rien
  useEffect(() => {
    if (!ouvert) return
    if (modeActif && !chargement && resultats.length === 0 && !erreur) {
      setOuvert(false)
    }
  }, [ouvert, modeActif, chargement, resultats.length, erreur])

  // Scroll vers l'élément actif
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

  // Navigation clavier
  function surTouche(e) {
    if (!ouvert) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOuvert(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndexActif((i) => Math.min(i + 1, resultats.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndexActif((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (resultats[indexActif]) {
        basculer(resultats[indexActif])
        setQ('')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOuvert(false)
    } else if (e.key === 'Backspace' && q === '' && choisis.length > 0) {
      // Retirer le dernier chip quand on efface à vide
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
  }

  const nbMasques = resultatsBruts.length - resultats.length

  return (
    <div ref={containerRef} className="relative">

      {/* ===== Combobox unifiée ===== */}
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2 pr-1 py-1.5 min-h-[44px]
                   focus-within:ring-4 focus-within:ring-indigo-500/15 focus-within:border-indigo-400 transition cursor-text"
        onClick={() => {
          setOuvert(true)
          containerRef.current?.querySelector('input[type=search]')?.focus()
        }}
      >
        {choisis.map((p) => (
          <span
            key={p.matricule}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 py-0.5 pl-1 pr-1.5 text-xs text-indigo-700"
          >
            <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
            <span className="font-medium">{p.prenom} {p.nom}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); basculer(p) }}
              className="rounded-full p-0.5 hover:bg-indigo-100"
              aria-label={`Retirer ${p.prenom} ${p.nom}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            if (e.target.value) setCodeService('')
            setOuvert(true)
          }}
          onFocus={() => setOuvert(true)}
          onKeyDown={surTouche}
          placeholder={choisis.length === 0 ? 'Rechercher un collaborateur…' : 'Ajouter…'}
          aria-label="Rechercher des destinataires"
          className="flex-1 min-w-[120px] border-0 bg-transparent py-1 px-1 text-sm
                     placeholder-slate-400 focus:outline-none"
        />

        {/* Filtre service compact */}
        <div className="relative shrink-0 border-l border-slate-100 pl-2">
          <Building2 className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
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
            className="appearance-none cursor-pointer rounded-md border-0 bg-transparent py-1 pl-7 pr-6 text-xs
                       text-slate-600 hover:bg-slate-50
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition"
          >
            <option value="">Tous les services</option>
            {services.map((s) => (
              <option key={s.code_service} value={s.code_service}>
                {s.nom_service} ({s.nb_utilisateurs})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* ===== Pop-up ===== */}
      {ouvert && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 ring-1 ring-black/5 overflow-hidden">

          {modeActif && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 bg-slate-50/70">
              <button
                type="button"
                onClick={reinitialiser}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 transition"
              >
                ← Réinitialiser les filtres
              </button>
              {!direct && resultats.length > 0 && (
                <button
                  type="button"
                  onClick={toutSelectionner}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  {filtreServiceActif ? 'Ajouter tout le service' : `Tout ajouter (${resultats.length})`}
                </button>
              )}
            </div>
          )}

          {!modeActif && (
            <div className="flex items-start gap-3 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Search className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Recherchez un collaborateur
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Tapez <span className="font-semibold">2 caractères</span> ou choisissez un <span className="font-semibold">service</span>.
                </p>
              </div>
            </div>
          )}

          {modeActif && chargement && (
            <div className="py-6 text-center text-sm text-slate-500">Recherche en cours…</div>
          )}

          {modeActif && !chargement && resultats.length > 0 && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-xs">
                <span className="text-slate-500">
                  {resultats.length} résultat{resultats.length > 1 ? 's' : ''}
                  {nbMasques > 0 && (
                    <span className="ml-1 text-slate-400">
                      · {nbMasques} déjà sélectionné{nbMasques > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
                {choisis.length > 0 && (
                  <span className="text-indigo-600 font-semibold">
                    {choisis.length} sélectionné{choisis.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Liste SANS checkbox */}
              <ul ref={listRef} className="max-h-72 divide-y divide-slate-50 overflow-y-auto">
                {resultats.map((p, idx) => {
                  const actif = idx === indexActif
                  return (
                    <li key={p.matricule} data-index={idx}>
                      <button
                        type="button"
                        onClick={() => {
                          basculer(p)
                          setQ('')
                        }}
                        onMouseEnter={() => setIndexActif(idx)}
                        className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                          actif ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {[p.poste, p.service].filter(Boolean).join(' · ') || p.email}
                          </span>
                        </span>
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-md transition ${
                          actif ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'
                        }`}>
                          {actif ? <CornerDownLeft className="size-3.5" /> : <Plus className="size-4" />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Pied d'aide clavier */}
              <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 bg-slate-50/50">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[9px]">↑↓</kbd>
                  naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[9px]">Entrée</kbd>
                  sélectionner
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-sans text-[9px]">Échap</kbd>
                  fermer
                </span>
              </div>
            </>
          )}

          {erreur && (
            <p className="px-4 py-3 text-sm text-red-600" role="alert">{erreur}</p>
          )}
        </div>
      )}
    </div>
  )
}
