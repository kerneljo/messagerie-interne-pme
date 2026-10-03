import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, X, Users, AlertTriangle } from 'lucide-react'
import api from '../api'
import useDebounce from '../useDebounce'
import { Avatar } from '../components/ui'

export default function NouveauGroupe() {
  const navigate = useNavigate()
  const [titre, setTitre] = useState('')
  const [recherche, setRecherche] = useState('')
  const [resultats, setResultats] = useState([])
  const [chargementRecherche, setChargementRecherche] = useState(false)
  const [selection, setSelection] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  const rechercheDebouncee = useDebounce(recherche, 300)

  useEffect(() => {
    if (!rechercheDebouncee || rechercheDebouncee.length < 2) {
      setResultats([])
      return
    }
    setChargementRecherche(true)
    api.get('/api/annuaire', { params: { q: rechercheDebouncee } })
      .then((r) => setResultats(r.data))
      .catch(() => setResultats([]))
      .finally(() => setChargementRecherche(false))
  }, [rechercheDebouncee])

  function ajouter(user) {
    if (selection.some((s) => s.matricule === user.matricule)) return
    setSelection([...selection, user])
    setRecherche('')
    setResultats([])
  }

  function retirer(matricule) {
    setSelection(selection.filter((s) => s.matricule !== matricule))
  }

  async function creer(e) {
    e.preventDefault()
    setErreur('')

    if (selection.length < 2) {
      setErreur('Un groupe doit avoir au moins 3 participants (vous compris).')
      return
    }
    if (!titre.trim()) {
      setErreur('Le titre du groupe est obligatoire.')
      return
    }

    setEnvoi(true)
    try {
      const r = await api.post('/api/conversations/groupe', {
        titre: titre.trim(),
        participants: selection.map((s) => s.matricule),
      })
      navigate(`/conversations/${r.data.reference_conversation}`)
    } catch (err) {
      const data = err.response?.data
      setErreur(data?.message || 'Erreur lors de la création.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="w-full px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="size-4" />
          Retour
        </button>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Nouveau groupe
        </span>
      </div>

      <form onSubmit={creer} className="max-w-3xl space-y-5">

        {/* Titre */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <label htmlFor="titre" className="block text-sm font-bold text-slate-900 mb-3">
            Nom du groupe *
          </label>
          <input
            id="titre"
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex : Projet Alpha, Équipe Marketing…"
            maxLength={150}
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400
                       focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
          />
        </div>

        {/* Participants */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Participants</h3>
            <span className="text-xs font-medium text-slate-500">
              {selection.length + 1} personne{selection.length + 1 > 1 ? 's' : ''} · 3 minimum
            </span>
          </div>

          {selection.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selection.map((s) => (
                <span
                  key={s.matricule}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-1 pr-2 py-1 text-xs font-medium text-slate-700"
                >
                  <Avatar prenom={s.prenom} nom={s.nom} taille="sm" photoUrl={s.photo_url} />
                  <span>{s.prenom} {s.nom}</span>
                  <button
                    type="button"
                    onClick={() => retirer(s.matricule)}
                    className="rounded-full p-0.5 hover:bg-slate-200"
                    aria-label="Retirer"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un collaborateur à ajouter…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
                         focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400 transition"
            />
          </div>

          {chargementRecherche && (
            <div className="mt-2 py-2 text-xs text-slate-500">Recherche…</div>
          )}

          {resultats.length > 0 && (
            <ul className="mt-2 rounded-lg border border-slate-100 divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {resultats.map((u) => {
                const dejaSelectionne = selection.some((s) => s.matricule === u.matricule)
                return (
                  <li key={u.matricule}>
                    <button
                      type="button"
                      onClick={() => ajouter(u)}
                      disabled={dejaSelectionne}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-left"
                    >
                      <Avatar prenom={u.prenom} nom={u.nom} taille="sm" photoUrl={u.photo_url} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.prenom} {u.nom}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {u.poste || u.service || u.email}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {erreur && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="size-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{erreur}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={envoi || selection.length < 2 || !titre.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                       hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <Users className="size-4" />
            {envoi ? 'Création…' : 'Créer le groupe'}
          </button>
        </div>
      </form>
    </div>
  )
}
