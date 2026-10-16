import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { Avatar } from '../components/ui'
import { messageErreur } from '../utils'

const FILTRES = [
  { id: 'tout', libelle: 'Tout' },
  { id: 'urgent', libelle: 'Urgent' },
  { id: 'action', libelle: 'Action requise' },
  { id: 'retard', libelle: 'En retard' },
]

function formaterEcheance(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const maintenant = new Date()

  const jour =
    d.toDateString() === maintenant.toDateString()
      ? "aujourd'hui"
      : d.toDateString() === new Date(maintenant.getTime() + 86400000).toDateString()
        ? 'demain'
        : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return `${jour} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function formaterDateRelative(iso) {
  if (!iso) return ''
  const diffMin = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffJ = Math.floor(diffH / 24)
  if (diffJ === 1) return 'hier'
  return `il y a ${diffJ} j`
}

export default function ATraiter() {
  const { utilisateur } = useAuth()
  const [actions, setActions] = useState([])
  const [enAttente, setEnAttente] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState('tout')
  const [enCours, setEnCours] = useState(null)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur('')
    try {
      const { data } = await api.get('/api/actions')
      setActions(data.actions ?? [])
      setEnAttente(data.en_attente ?? 0)
    } catch (e) {
      setActions([])
      setEnAttente(0)
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  // Filtrage côté client
  const visibles = useMemo(() => {
    if (filtre === 'urgent') return actions.filter((a) => a.categorie === 'URGENT')
    if (filtre === 'action') return actions.filter((a) => a.categorie === 'ACTION_REQUISE')
    if (filtre === 'retard') return actions.filter((a) => a.en_retard)
    return actions
  }, [actions, filtre])

  async function accuser(action, statut) {
    setEnCours(action.reference_message)
    setErreur('')
    // Optimistic UI : on retire l'action si elle est terminée
    const termine = statut === 'FAIT' || action.categorie === 'URGENT'
    if (termine) {
      setActions((actuelles) =>
        actuelles.filter((a) => a.reference_message !== action.reference_message)
      )
      setEnAttente((n) => Math.max(0, n - 1))
    } else {
      setActions((actuelles) =>
        actuelles.map((a) =>
          a.reference_message === action.reference_message ? { ...a, etat: statut } : a
        )
      )
    }

    try {
      await api.post(`/api/messages/${action.reference_message}/prise-en-compte`, { statut })
    } catch (e) {
      setErreur(messageErreur(e))
      charger() // rollback
    } finally {
      setEnCours(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6 md:px-8">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">À traiter</h2>
          <p className="mt-1 text-sm text-slate-500">
            {enAttente > 0
              ? `${enAttente} message${enAttente > 1 ? 's' : ''} attend${enAttente > 1 ? 'ent' : ''} votre action`
              : 'Vous êtes à jour 🎉'}
          </p>
        </div>
        <button
          type="button"
          onClick={charger}
          disabled={chargement}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-label="Rafraîchir"
        >
          <RefreshCw className={`size-4 ${chargement ? 'animate-spin' : ''}`} aria-hidden="true" />
          Rafraîchir
        </button>
      </header>

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer les actions">
        {FILTRES.map((f) => {
          const actif = filtre === f.id
          const compte =
            f.id === 'tout'
              ? actions.length
              : f.id === 'urgent'
                ? actions.filter((a) => a.categorie === 'URGENT').length
                : f.id === 'action'
                  ? actions.filter((a) => a.categorie === 'ACTION_REQUISE').length
                  : actions.filter((a) => a.en_retard).length
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltre(f.id)}
              aria-pressed={actif}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                actif
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.libelle}
              {compte > 0 && (
                <span className={`ml-1.5 ${actif ? 'text-white/80' : 'text-slate-500'}`}>
                  {compte}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Erreur */}
      {erreur && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800" role="alert">
          {erreur}
        </p>
      )}

      {/* Contenu */}
      {chargement ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Chargement…
        </div>
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ClipboardCheck className="mx-auto size-10 text-emerald-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {filtre === 'tout' ? 'Tout est à jour' : 'Aucune action dans ce filtre'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {filtre === 'tout'
              ? 'Aucun message ne requiert votre attention.'
              : 'Essayez un autre filtre.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((a) => (
            <CarteAction
              key={a.reference_message}
              action={a}
              moi={utilisateur}
              enCours={enCours === a.reference_message}
              onAccuser={accuser}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ============================================================
   Carte d'une action
   ============================================================ */
function CarteAction({ action: a, moi, enCours, onAccuser }) {
  const urgent = a.categorie === 'URGENT'
  const dejaPris = a.etat === 'PRIS_EN_COMPTE'

  const styles = urgent
    ? {
        badge: 'bg-red-100 text-red-700',
        bordure: a.en_retard ? 'border-red-300 bg-red-50/40' : 'border-red-200',
        icone: AlertTriangle,
        libelle: 'Urgent',
      }
    : {
        badge: 'bg-amber-100 text-amber-700',
        bordure: a.en_retard ? 'border-red-300 bg-red-50/40' : 'border-slate-200',
        icone: ClipboardCheck,
        libelle: 'Action requise',
      }

  const Icone = styles.icone

  return (
    <li className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${styles.bordure}`}>
      {/* En-tête de la carte */}
      <div className="flex items-start gap-3 p-4">
        <Avatar
          prenom={a.expediteur?.prenom}
          nom={a.expediteur?.nom}
          photoUrl={a.expediteur?.photo_url}
          taille="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
              <Icone className="size-3" aria-hidden="true" />
              {styles.libelle}
            </span>
            {a.en_retard && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <Clock className="size-3" aria-hidden="true" />
                En retard
              </span>
            )}
            {dejaPris && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                <Check className="size-3" aria-hidden="true" />
                Pris en compte
              </span>
            )}
          </div>

          <p className="mt-1.5 text-sm text-slate-800">
            <span className="font-semibold">
              {a.expediteur?.prenom} {a.expediteur?.nom}
            </span>
            <span className="text-slate-500"> · {formaterDateRelative(a.date_envoi)}</span>
          </p>

          <p className="mt-2 line-clamp-2 text-sm text-slate-700">{a.apercu}</p>

          {a.echeance && (
            <p className={`mt-1.5 text-xs ${a.en_retard ? 'font-semibold text-red-700' : 'text-slate-500'}`}>
              Échéance : {formaterEcheance(a.echeance)}
            </p>
          )}

          <Link
            to={`/conversations/${a.conversation.reference_conversation}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {a.conversation.titre}
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        {dejaPris ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <Check className="size-3.5" aria-hidden="true" />
            Vous avez pris en compte
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onAccuser(a, 'PRIS_EN_COMPTE')}
            disabled={enCours}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {enCours ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
            Pris en compte
          </button>
        )}

        {!urgent && (
          <button
            type="button"
            onClick={() => onAccuser(a, 'FAIT')}
            disabled={enCours}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            Marquer comme fait
          </button>
        )}
      </div>
    </li>
  )
}
