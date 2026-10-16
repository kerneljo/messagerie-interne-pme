import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Info,
  Loader2,
  MessageSquare,
  AtSign,
} from 'lucide-react'
import api from '../api'
import { messageErreur } from '../utils'

const ONGLETS = [
  { id: 'toutes', libelle: 'Toutes' },
  { id: 'action', libelle: 'Actions' },
  { id: 'mention', libelle: 'Mentions' },
  { id: 'information', libelle: 'Infos' },
]

const TYPES = {
  action_requise: {
    icone: AlertTriangle,
    couleur: 'bg-amber-100 text-amber-700',
    libelle: 'Action requise',
  },
  mention: {
    icone: AtSign,
    couleur: 'bg-indigo-100 text-indigo-700',
    libelle: 'Mention',
  },
  information: {
    icone: Info,
    couleur: 'bg-sky-100 text-sky-700',
    libelle: 'Information',
  },
  message: {
    icone: MessageSquare,
    couleur: 'bg-slate-100 text-slate-600',
    libelle: 'Message',
  },
}

function formaterDateRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffJ = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffH < 24) return `Il y a ${diffH} h`
  if (diffJ === 1) return 'Hier'
  if (diffJ < 7) return `Il y a ${diffJ} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function grouperParJour(notifications) {
  const aujourdHui = new Date()
  aujourdHui.setHours(0, 0, 0, 0)
  const hier = new Date(aujourdHui)
  hier.setDate(hier.getDate() - 1)

  const groupes = {
    "Aujourd'hui": [],
    Hier: [],
    'Plus ancien': [],
  }

  for (const n of notifications) {
    const d = new Date(n.date_creation)
    d.setHours(0, 0, 0, 0)
    if (d >= aujourdHui) groupes["Aujourd'hui"].push(n)
    else if (d >= hier) groupes.Hier.push(n)
    else groupes['Plus ancien'].push(n)
  }

  return Object.entries(groupes).filter(([, items]) => items.length > 0)
}

export default function Notifications() {
  const [onglet, setOnglet] = useState('toutes')
  const [notifications, setNotifications] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(null)

  async function charger() {
    setChargement(true)
    setErreur('')
    try {
      const { data } = await api.get('/api/notifications', {
        params: { type: onglet === 'toutes' ? undefined : onglet },
      })
      // Selon le controller : soit un tableau direct, soit { data: [...] }
      setNotifications(Array.isArray(data) ? data : (data.data ?? []))
    } catch (e) {
      setNotifications([])
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onglet])

  const parJour = useMemo(() => grouperParJour(notifications), [notifications])

  async function marquerLue(n) {
    if (n.est_lue) return
    setEnCours(n.reference_notification)
    // Optimistic UI
    setNotifications((actuels) =>
      actuels.map((x) =>
        x.reference_notification === n.reference_notification
          ? { ...x, est_lue: true, date_lecture: new Date().toISOString() }
          : x
      )
    )
    try {
      await api.post(`/api/notifications/${n.reference_notification}/lire`)
    } catch {
      charger() // rollback : on recharge
    } finally {
      setEnCours(null)
    }
  }

  async function toutMarquerLues() {
    try {
      await api.post('/api/notifications/tout-lire')
      setNotifications((actuels) =>
        actuels.map((x) =>
          x.type === 'action_requise' ? x : { ...x, est_lue: true }
        )
      )
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  const nbNonLues = notifications.filter((n) => !n.est_lue).length

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-6 md:px-8">
      {/* En-tête */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">
            {nbNonLues > 0
              ? `${nbNonLues} notification${nbNonLues > 1 ? 's' : ''} non lue${nbNonLues > 1 ? 's' : ''}`
              : 'Vous êtes à jour.'}
          </p>
        </div>
        {nbNonLues > 0 && (
          <button
            type="button"
            onClick={toutMarquerLues}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Tout marquer comme lu
          </button>
        )}
      </header>

      {/* Onglets */}
      <div
        role="tablist"
        aria-label="Filtrer les notifications"
        className="mb-5 inline-flex rounded-xl bg-slate-100 p-1"
      >
        {ONGLETS.map((o) => {
          const actif = onglet === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={actif}
              onClick={() => setOnglet(o.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                actif
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {o.libelle}
            </button>
          )
        })}
      </div>

      {/* Erreur */}
      {erreur && (
        <p
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
          role="alert"
        >
          {erreur}
        </p>
      )}

      {/* Contenu */}
      {chargement ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Chargement des notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Bell className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            Aucune notification
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {onglet === 'toutes'
              ? 'Vos notifications apparaîtront ici.'
              : 'Aucune notification dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {parJour.map(([jour, items]) => (
            <section key={jour}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {jour}
              </h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {items.map((n) => (
                  <CarteNotification
                    key={n.reference_notification}
                    n={n}
                    enCours={enCours === n.reference_notification}
                    onMarquerLue={() => marquerLue(n)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Carte de notification
   ============================================================ */
function CarteNotification({ n, enCours, onMarquerLue }) {
  const config = TYPES[n.type] ?? TYPES.message
  const Icone = config.icone

  const contenu = (
    <div className={`flex items-start gap-3 px-4 py-3 ${n.est_lue ? '' : 'bg-lagon-50/40'}`}>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${config.couleur}`}
        aria-hidden="true"
      >
        <Icone className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.couleur}`}>
            {config.libelle}
          </span>
          {!n.est_lue && (
            <span className="size-1.5 rounded-full bg-piment-600" aria-label="Non lue" />
          )}
        </div>

        <p className={`mt-1.5 text-sm ${n.est_lue ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>
          {n.extrait ?? 'Nouvelle activité'}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formaterDateRelative(n.date_creation)}
        </p>
      </div>

      {!n.est_lue && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarquerLue()
          }}
          disabled={enCours}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          aria-label="Marquer comme lue"
          title="Marquer comme lue"
        >
          {enCours ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  )

  // Si un lien vers la conversation est disponible, la carte devient cliquable
  if (n.reference_conversation) {
    return (
      <li>
        <Link
          to={`/conversations/${n.reference_conversation}`}
          className="block transition hover:bg-slate-50"
          onClick={onMarquerLue}
        >
          {contenu}
        </Link>
      </li>
    )
  }

  return <li>{contenu}</li>
}
