import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Paperclip, Search } from 'lucide-react'
import api from '../api'
import usePolling from '../usePolling'
import { heureCourte, messageErreur } from '../utils'
import { Avatar, Carte, Chargement, EtatVide, Pagination } from '../components/ui'

export default function Recus() {
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  // Recherche avec un petit délai pendant la saisie
  useEffect(() => {
    const minuteur = setTimeout(() => {
      setQ(recherche.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [recherche])

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/api/messages/recus', {
        params: { page, q: q || undefined, non_lus: filtre === 'non_lus' ? 1 : undefined },
      })
      setResultat(data)
      setErreur('')
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [page, q, filtre])

  usePolling(charger, 15000)

  function changerFiltre(valeur) {
    setFiltre(valeur)
    setPage(1)
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {[['tous', 'Tous'], ['non_lus', 'Non lus']].map(([valeur, nom]) => (
            <button
              key={valeur}
              onClick={() => changerFiltre(valeur)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                filtre === valeur ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {nom}
            </button>
          ))}
        </div>

        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les messages reçus..."
            aria-label="Rechercher dans les messages reçus"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>
      </div>

      {erreur && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erreur}</p>}

      <Carte>
        {!resultat && !erreur && <Chargement />}
        {resultat && resultat.data.length === 0 && (
          <EtatVide icone={Inbox} titre={filtre === 'non_lus' ? 'Aucun message non lu' : 'Aucun message reçu'}>
            Les messages que vous recevez apparaîtront ici.
          </EtatVide>
        )}
        {resultat && resultat.data.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {resultat.data.map((m) => (
              <li key={m.reference_message}>
                <button
                  onClick={() => navigate(`/conversations/${m.reference_conversation}`)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${m.lu ? '' : 'bg-blue-50/40'}`}
                >
                  <span className={`size-2 shrink-0 rounded-full ${m.lu ? 'bg-transparent' : 'bg-blue-600'}`} aria-label={m.lu ? 'Lu' : 'Non lu'} />
                  <Avatar prenom={m.expediteur.prenom} nom={m.expediteur.nom} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className={`truncate text-sm ${m.lu ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                        {m.expediteur.prenom} {m.expediteur.nom}
                        {m.conversation.type !== 'DIRECT' && (
                          <span className="ml-2 font-normal text-slate-500">· {m.conversation.titre}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{heureCourte(m.date_envoi)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                      <span className="truncate">{m.apercu}</span>
                      {m.nb_fichiers > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                          <Paperclip className="size-3.5" />{m.nb_fichiers}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {resultat && (
          <Pagination page={resultat.current_page} derniere={resultat.last_page} total={resultat.total} onChange={setPage} />
        )}
      </Carte>
    </div>
  )
}
