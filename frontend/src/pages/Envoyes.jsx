import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCheck, Paperclip, Search, SendHorizontal } from 'lucide-react'
import api from '../api'
import usePolling from '../usePolling'
import { heureCourte, messageErreur } from '../utils'
import { Avatar, Carte, Chargement, EtatVide, Pagination } from '../components/ui'

export default function Envoyes() {
  const navigate = useNavigate()
  const [recherche, setRecherche] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    const minuteur = setTimeout(() => {
      setQ(recherche.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(minuteur)
  }, [recherche])

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/api/messages/envoyes', { params: { page, q: q || undefined } })
      setResultat(data)
      setErreur('')
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [page, q])

  usePolling(charger, 15000)

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher dans les messages envoyés..."
          aria-label="Rechercher dans les messages envoyés"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
        />
      </div>

      {erreur && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erreur}</p>}

      <Carte>
        {!resultat && !erreur && <Chargement />}
        {resultat && resultat.data.length === 0 && (
          <EtatVide icone={SendHorizontal} titre="Aucun message envoyé">
            Les messages que vous envoyez apparaîtront ici.
          </EtatVide>
        )}
        {resultat && resultat.data.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {resultat.data.map((m) => {
              const tousLus = m.destinataires > 0 && m.lus >= m.destinataires
              return (
                <li key={m.reference_message}>
                  <button
                    onClick={() => navigate(`/conversations/${m.reference_conversation}`)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <Avatar prenom={m.titre} nom="" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-800">
                          À : {m.titre}
                          {m.conversation.type !== 'DIRECT' && (
                            <span className="ml-2 font-normal text-slate-500">· {m.destinataires} destinataires</span>
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
                    <span className={`flex shrink-0 items-center gap-1 text-xs ${tousLus ? 'text-blue-600' : 'text-slate-400'}`}>
                      {m.lus > 0 ? <CheckCheck className="size-4" /> : <Check className="size-4" />}
                      {m.lus > 0 ? `Lu ${m.lus}/${m.destinataires}` : 'Envoyé'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {resultat && (
          <Pagination page={resultat.current_page} derniere={resultat.last_page} total={resultat.total} onChange={setPage} />
        )}
      </Carte>
    </div>
  )
}
