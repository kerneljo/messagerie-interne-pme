import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import api from '../api'
import { useMessagerie } from '../MessagerieContext'
import useClickDehors from '../useClickDehors'
import { heureCourte } from '../utils'

const MAX_AFFICHEES = 6

export default function NotificationsMenu() {
  const { conversationsNonLues, nonLus, recharger } = useMessagerie()
  const [ouvert, setOuvert] = useState(false)
  const conteneur = useRef(null)
  const navigate = useNavigate()

  useClickDehors(conteneur, () => setOuvert(false))

  function ouvrir(conversation) {
    setOuvert(false)
    navigate(`/conversations/${conversation.reference_conversation}`)
  }

  async function toutMarquerLu() {
    await Promise.all(
      conversationsNonLues.map((c) => api.post(`/api/conversations/${c.reference_conversation}/lu`).catch(() => null))
    )
    await recharger()
  }

  return (
    <div className="relative" ref={conteneur}>
      <button
        onClick={() => setOuvert((o) => !o)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label={nonLus > 0 ? `Notifications (${nonLus} non lues)` : 'Notifications'}
        aria-expanded={ouvert}
      >
        <Bell className="size-5" />
        {nonLus > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-5 text-white">
            {nonLus > 99 ? '99+' : nonLus}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Notifications</h2>
            {nonLus > 0 && (
              <button onClick={toutMarquerLu} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                <CheckCheck className="size-3.5" /> Tout marquer comme lu
              </button>
            )}
          </div>

          {conversationsNonLues.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-slate-500">
              <BellOff className="size-8 text-slate-300" />
              Aucune nouvelle notification
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {conversationsNonLues.slice(0, MAX_AFFICHEES).map((c) => (
                <li key={c.reference_conversation}>
                  <button onClick={() => ouvrir(c)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-600" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{c.titre}</span>
                        <span className="shrink-0 text-xs text-slate-400">{heureCourte(c.derniere_activite)}</span>
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {c.non_lus > 1 ? `${c.non_lus} nouveaux messages` : c.dernier_message ?? 'Nouvelle pièce jointe'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/conversations"
            onClick={() => setOuvert(false)}
            className="block rounded-b-xl border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-slate-50"
          >
            Voir la boîte de réception
          </Link>
        </div>
      )}
    </div>
  )
}
