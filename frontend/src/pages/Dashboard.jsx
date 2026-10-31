import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, Building2, CheckCircle2, ClipboardCheck, Clock,
  FolderOpen, Inbox, Lightbulb, LogIn, MessagesSquare, Minus, Paperclip, SendHorizontal,
  ShieldAlert, TrendingDown, TrendingUp, UserCheck, UserX,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { useMessagerie } from '../MessagerieContext'
import usePolling from '../usePolling'
import { heureCourte, messageErreur } from '../utils'
import { Avatar } from '../components/ui'

const PASTEL = {
  bleu: { fond: 'bg-blue-50', pastille: 'bg-blue-500', texte: 'text-blue-700', trait: 'text-blue-500' },
  vert: { fond: 'bg-emerald-50', pastille: 'bg-emerald-500', texte: 'text-emerald-700', trait: 'text-emerald-500' },
  orange: { fond: 'bg-amber-50', pastille: 'bg-amber-500', texte: 'text-amber-700', trait: 'text-amber-500' },
  violet: { fond: 'bg-violet-50', pastille: 'bg-violet-500', texte: 'text-violet-700', trait: 'text-violet-500' },
  rouge: { fond: 'bg-red-50', pastille: 'bg-red-500', texte: 'text-red-700', trait: 'text-red-500' },
  gris: { fond: 'bg-slate-100', pastille: 'bg-slate-300', texte: 'text-slate-500', trait: 'text-slate-300' },
}

const OMBRE = 'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)]'
const CARTE = `rounded-2xl border border-slate-200/60 bg-white ${OMBRE}`
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E95420] focus-visible:ring-offset-2'

/* ============================================================
   Utilitaires
   ============================================================ */
function Squelette({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} aria-hidden="true" />
}

function lire(objet, ...cles) {
  for (const c of cles) {
    const v = objet?.[c]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

function enListe(d, cle) {
  if (Array.isArray(d)) return d
  if (Array.isArray(d?.[cle])) return d[cle]
  if (Array.isArray(d?.data)) return d.data
  return []
}

function dateCourte(valeur) {
  if (!valeur) return ''
  const d = new Date(valeur)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function courbe(pts, yMin, yMax) {
  if (pts.length < 2) return ''
  const borne = (v) => Math.min(yMax, Math.max(yMin, v))
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1y = borne(p1.y + (p2.y - p0.y) / 6)
    const c2y = borne(p2.y - (p3.y - p1.y) / 6)
    d += ` C${p1.x + (p2.x - p0.x) / 6},${c1y} ${p2.x - (p3.x - p1.x) / 6},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

/* ============================================================
   Briques
   ============================================================ */
function Sparkline({ valeurs, className = '' }) {
  if (valeurs.length < 2) return null
  const L = 96
  const H = 32
  const P = 3
  const max = Math.max(1, ...valeurs)
  const pts = valeurs.map((v, i) => ({
    x: (i / (valeurs.length - 1)) * L,
    y: H - P - (v / max) * (H - 2 * P),
  }))
  const trait = courbe(pts, P, H - P)
  const dernier = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className={`h-8 w-24 shrink-0 overflow-visible ${className}`} aria-hidden="true">
      <path d={`${trait} L${L},${H} L0,${H} Z`} fill="currentColor" opacity="0.1" />
      <path d={trait} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={dernier.x} cy={dernier.y} r="2.5" fill="currentColor" />
    </svg>
  )
}

function Tendance({ delta }) {
  const Icone = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const couleur =
    delta > 0 ? 'bg-emerald-50 text-emerald-700' : delta < 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
  const texte = delta === 0 ? 'Stable' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${couleur}`}>
      <Icone className="size-3.5" aria-hidden="true" />
      {texte}
    </span>
  )
}

function Tuile({ titre, valeur, sous, icone: Icone, teinte, to, actif = true, serie, delta }) {
  const t = PASTEL[actif ? teinte : 'gris']
  const aDelta = delta !== undefined
  const contenu = (
    <>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${t.fond} ${t.texte}`}>
        <Icone className="size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-3xl font-extrabold leading-none tracking-tight tabular-nums ${actif ? 'text-slate-800' : 'text-slate-400'}`}>
          {valeur}
        </p>
        <p className="mt-1.5 truncate text-sm font-semibold text-slate-700">{titre}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          {aDelta && <Tendance delta={delta} />}
          <span className={`truncate ${aDelta ? 'text-slate-500' : t.texte}`}>{sous}</span>
        </div>
      </div>

      {serie && <Sparkline valeurs={serie} className={t.trait} />}

      {to && (
        <ArrowUpRight
          className="absolute right-3 top-3 size-4 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500"
          aria-hidden="true"
        />
      )}
    </>
  )
  const classes = `group relative flex items-center gap-4 p-4 transition-all duration-200 ${CARTE}`
  if (!to) return <div className={classes}>{contenu}</div>
  return (
    <Link to={to} className={`${classes} hover:-translate-y-0.5 hover:border-slate-300 ${FOCUS}`}>
      {contenu}
    </Link>
  )
}

function EnTete({ titre, to, lien = 'Tout voir', badge, icone: Icone, teinte = 'gris' }) {
  const t = PASTEL[teinte]
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icone && (
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${t.fond} ${t.texte}`}>
            <Icone className="size-4" aria-hidden="true" />
          </span>
        )}
        <h2 className="truncate font-semibold text-slate-800">{titre}</h2>
        {badge > 0 && (
          <span className="rounded-full bg-[#D9461A] px-2 py-0.5 text-xs font-bold text-white">{badge}</span>
        )}
      </div>
      {to && (
        <Link
          to={to}
          className={`group/lien flex shrink-0 items-center gap-1 rounded text-sm font-semibold text-[#C2410C] ${FOCUS}`}
        >
          {lien}
          <ArrowRight
            className="size-3.5 transition-transform group-hover/lien:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  )
}

function EtatVide({ texte, titre }) {
  return (
    <div className="flex flex-1 items-center gap-3 px-5 py-6">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="size-4" aria-hidden="true" />
      </span>
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-800">{titre}</span> {texte}
      </p>
    </div>
  )
}

/* ============================================================
   Activité : courbes lissées
   ============================================================ */
function Activite({ jours }) {
  const L = 700
  const H = 180
  const HAUT = 16
  const BAS = 8
  const max = Math.max(1, ...jours.flatMap((j) => [j.envoyes, j.recus]))
  const n = jours.length
  const aujourdhui = new Date().toDateString()

  const x = (i) => ((i + 0.5) / n) * L
  const y = (v) => H - BAS - (v / max) * (H - HAUT - BAS)
  const yMin = HAUT
  const yMax = H - BAS

  const traceEnvoyes = courbe(jours.map((j, i) => ({ x: x(i), y: y(j.envoyes) })), yMin, yMax)
  const traceRecus = courbe(jours.map((j, i) => ({ x: x(i), y: y(j.recus) })), yMin, yMax)
  const zone = `${traceEnvoyes} L${x(n - 1)},${yMax} L${x(0)},${yMax} Z`

  const totalEnvoyes = jours.reduce((s, j) => s + j.envoyes, 0)
  const totalRecus = jours.reduce((s, j) => s + j.recus, 0)

  return (
    <section className={`${CARTE} flex h-full flex-col p-5`} aria-label="Activité des 7 derniers jours">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${PASTEL.bleu.fond} ${PASTEL.bleu.texte}`}>
            <Activity className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold leading-tight text-slate-800">Activité</h2>
            <p className="text-sm text-slate-500">7 derniers jours</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
            <span className="size-2.5 rounded-full bg-blue-600" aria-hidden="true" />
            <strong className="text-slate-800">{totalEnvoyes}</strong> envoyés
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
            <span className="size-2.5 rounded-full bg-slate-400" aria-hidden="true" />
            <strong className="text-slate-800">{totalRecus}</strong> reçus
          </span>
        </div>
      </div>

      <div className="relative mt-4 min-h-28 flex-1">
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="zone-envoyes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((r) => (
            <line
              key={r} x1="0" x2={L} y1={H * r} y2={H * r}
              className="text-slate-200" stroke="currentColor" strokeDasharray="4 6" strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g className="text-blue-600">
            <path d={zone} fill="url(#zone-envoyes)" />
            <path d={traceEnvoyes} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
          <path d={traceRecus} fill="none" className="text-slate-400" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {jours.map((j) => {
            const libelle = new Date(`${j.jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' })
            return (
              <div key={j.jour} className="group relative outline-none" tabIndex={0}
                aria-label={`${libelle} : ${j.envoyes} envoyé(s), ${j.recus} reçu(s)`}>
                <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-slate-300 group-hover:block group-focus:block" aria-hidden="true" />
                <span className="absolute left-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow group-hover:block group-focus:block"
                  style={{ top: `${(y(j.envoyes) / H) * 100}%` }} aria-hidden="true" />
                <span className="absolute left-1/2 hidden size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400 shadow group-hover:block group-focus:block"
                  style={{ top: `${(y(j.recus) / H) * 100}%` }} aria-hidden="true" />
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block group-focus:block">
                  {j.envoyes} envoyé{j.envoyes > 1 ? 's' : ''} · {j.recus} reçu{j.recus > 1 ? 's' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {jours.map((j) => {
          const date = new Date(`${j.jour}T12:00:00`)
          const estAujourdhui = date.toDateString() === aujourdhui
          return (
            <span key={j.jour}
              className={`mx-auto rounded-full px-2 py-0.5 text-xs capitalize ${estAujourdhui ? 'bg-[#D9461A] font-semibold text-white' : 'text-slate-500'}`}>
              {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
            </span>
          )
        })}
      </div>
    </section>
  )
}

/* ============================================================
   Cartes de contenu
   ============================================================ */
function CarteALire({ conversations, utilisateur }) {
  const nb = conversations.length
  return (
    <section className={`flex h-full flex-col overflow-hidden ${CARTE}`} aria-label="À lire">
      <EnTete titre="À lire" to="/conversations" badge={nb} icone={MessagesSquare} teinte="bleu" />
      {nb === 0 ? (
        <EtatVide titre="Tout est lu." texte="Vous êtes à jour." />
      ) : (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {conversations.slice(0, 3).map((c) => {
            const autre = c.participants.find((p) => p.matricule !== utilisateur.matricule)
            return (
              <li key={c.reference_conversation}>
                <Link to={`/conversations/${c.reference_conversation}`}
                  className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-slate-50">
                  <Avatar prenom={c.type === 'DIRECT' ? autre?.prenom : c.titre} nom={c.type === 'DIRECT' ? autre?.nom : ''} taille="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800">{c.titre}</span>
                      <span className="shrink-0 text-xs text-slate-400">{heureCourte(c.derniere_activite)}</span>
                    </span>
                    <span className="block truncate text-xs text-slate-500">{c.dernier_message ?? 'Pièce jointe'}</span>
                  </span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E95420] px-1.5 text-[10px] font-bold text-white">
                    {c.non_lus}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function CarteActions({ actions }) {
  return (
    <section className={`flex h-full flex-col overflow-hidden ${CARTE}`} aria-label="Actions à traiter">
      <EnTete titre="À traiter" to="/a-traiter" badge={actions.length} icone={ClipboardCheck} teinte="orange" />
      {actions.length === 0 ? (
        <EtatVide titre="Rien en attente." texte="Aucune action ne vous est demandée." />
      ) : (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {actions.slice(0, 3).map((a, i) => {
            const titre = lire(a, 'titre', 'objet', 'contenu', 'texte') ?? lire(a.message, 'contenu', 'texte') ?? 'Action à traiter'
            const echeance = lire(a, 'echeance', 'date_limite', 'date_echeance')
            const enRetard = Boolean(a.en_retard)
            return (
              <li key={lire(a, 'id', 'reference_message', 'reference') ?? i}>
                <Link to="/a-traiter" className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-slate-50">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${enRetard ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    <ClipboardCheck className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{titre}</span>
                    {echeance && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="size-3" aria-hidden="true" />
                        Avant le {dateCourte(echeance)}
                      </span>
                    )}
                  </span>
                  {enRetard && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">En retard</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Raccourci({ touches, texte }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
      <span className="text-sm text-slate-600">{texte}</span>
      <div className="flex shrink-0 gap-1">
        {touches.map((t) => (
          <kbd
            key={t}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 font-sans text-xs font-semibold text-slate-600 shadow-[0_1px_0_rgba(15,23,42,0.08)]"
          >
            {t}
          </kbd>
        ))}
      </div>
    </div>
  )
}

function CarteAstuces() {
  return (
    <section className={`${CARTE} flex h-full flex-col overflow-hidden`} aria-label="Astuces d'utilisation">
      <EnTete titre="Le saviez-vous ?" icone={Lightbulb} teinte="orange" />
      <div className="flex flex-1 flex-col justify-center gap-3 px-5 py-4">
        <Raccourci touches={['Ctrl', 'B']} texte="Replier / déplier le menu" />
        <Raccourci touches={['Entrée']} texte="Envoyer un message" />
      </div>
    </section>
  )
}

function CartePiecesJointes({ piecesJointes }) {
  return (
    <section className={`flex h-full flex-col overflow-hidden ${CARTE}`} aria-label="Pièces jointes récentes">
      <EnTete titre="Pièces jointes récentes" to="/documents" icone={Paperclip} teinte="violet" />
      {piecesJointes.length === 0 ? (
        <EtatVide titre="Aucune pièce jointe." texte="Les fichiers échangés apparaîtront ici." />
      ) : (
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {piecesJointes.slice(0, 3).map((d, i) => {
            const nom = lire(d, 'nom_original', 'nom_fichier', 'nom', 'titre') ?? 'Sans titre'
            const date = lire(d, 'date_envoi', 'created_at', 'date', 'envoye_le')
            const exp = lire(d, 'expediteur_nom', 'expediteur', 'auteur')
            const expediteur = typeof exp === 'object' && exp ? [exp.prenom, exp.nom].filter(Boolean).join(' ') : exp
            return (
              <li key={lire(d, 'id', 'reference_fichier', 'reference') ?? i}>
                <Link to="/documents" className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-slate-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Paperclip className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{nom}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[expediteur, dateCourte(date)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function StatAdmin({ titre, valeur, icone: Icone, teinte, alerte = false, className = '' }) {
  const t = PASTEL[teinte]
  return (
    <div className={`flex items-center gap-3.5 bg-white px-4 py-3.5 ${className}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.fond} ${t.texte}`}>
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={`text-2xl font-extrabold leading-none tracking-tight tabular-nums ${alerte ? 'text-red-600' : 'text-slate-800'}`}>
          {valeur}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{titre}</p>
      </div>
    </div>
  )
}

/* ============================================================
   Page
   ============================================================ */
export default function Dashboard() {
  const { utilisateur } = useAuth()
  const { conversationsNonLues } = useMessagerie()
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState('')
  const [extra, setExtra] = useState({ actions: [], enAttente: 0, documents: [], derniereConnexion: null })

  const charger = useCallback(async () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { data } = await api.get('/api/dashboard', { params: { tz } })
      setDonnees(data)
      setErreur('')
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }, [])

  const chargerExtra = useCallback(async () => {
    const [actions, documents, profil] = await Promise.allSettled([
      api.get('/api/actions'),
      api.get('/api/documents'),
      api.get('/api/profil'),
    ])
    setExtra((prec) => {
      const suivant = { ...prec }
      if (actions.status === 'fulfilled') {
        const liste = enListe(actions.value.data, 'actions')
        suivant.actions = liste
        suivant.enAttente = actions.value.data?.en_attente ?? liste.length
      }
      if (documents.status === 'fulfilled') {
        suivant.documents = enListe(documents.value.data, 'documents')
      }
      if (profil.status === 'fulfilled') {
        const p = profil.value.data?.data ?? profil.value.data
        suivant.derniereConnexion = lire(p, 'derniere_connexion', 'last_login_at', 'derniere_connexion_at')
      }
      return suivant
    })
  }, [])

  usePolling(charger, 120000)
  usePolling(chargerExtra, 120000)

  const estAdmin = Boolean(donnees?.admin)
  const activite = donnees?.activite ?? []
  const aDeLActivite = activite.some((j) => j.envoyes > 0 || j.recus > 0)
  const enRetard = extra.actions.some((a) => a.en_retard)

  const dernier = activite[activite.length - 1]
  const veille = activite[activite.length - 2]
  const envoyesAujourdhui = dernier?.envoyes ?? 0
  const envoyesHier = veille?.envoyes ?? 0
  const recusAujourdhui = dernier?.recus ?? 0
  const recusHier = veille?.recus ?? 0

  /* Graphique + astuces : prend tout l'espace restant sur grand écran */
  const blocActivite = aDeLActivite && (
    <div className="grid shrink-0 items-stretch gap-4 lg:min-h-[16rem] lg:flex-1 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)]">
      <div className="min-h-0 lg:col-span-2">
        <Activite jours={activite} />
      </div>
      <div className="min-h-0">
        <CarteAstuces />
      </div>
    </div>
  )

  /* Cartes secondaires : hauteur fixe, moins prioritaires que le graphique */
  const blocCartes = (
    <div
      className={`grid shrink-0 items-stretch gap-4 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] ${
        aDeLActivite ? 'lg:h-[13.5rem]' : 'lg:min-h-[13.5rem] lg:flex-1'
      }`}
    >
      <CarteALire conversations={conversationsNonLues} utilisateur={utilisateur} />
      <CarteActions actions={extra.actions} />
      <CartePiecesJointes piecesJointes={extra.documents} />
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:p-5">
      {erreur && (
        <p className="shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erreur}</p>
      )}

      {!donnees && !erreur && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-28" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <Squelette key={i} className="h-56" />)}
          </div>
        </>
      )}

      {donnees && (
        <>
          {/* 1. Indicateurs */}
          <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Tuile
              titre="Actions à traiter"
              valeur={extra.enAttente}
              sous={enRetard ? 'Au moins une est en retard' : extra.enAttente > 0 ? 'En attente de votre part' : 'Rien en attente'}
              icone={ClipboardCheck}
              teinte={enRetard ? 'rouge' : 'orange'}
              actif={extra.enAttente > 0}
              to="/a-traiter"
            />
            <Tuile
              titre="Envoyés aujourd'hui"
              valeur={envoyesAujourdhui}
              sous="par rapport à hier"
              icone={SendHorizontal}
              teinte="vert"
              serie={activite.map((j) => j.envoyes)}
              delta={envoyesAujourdhui - envoyesHier}
            />
            <Tuile
              titre="Reçus aujourd'hui"
              valeur={recusAujourdhui}
              sous="par rapport à hier"
              icone={Inbox}
              teinte="bleu"
              serie={activite.map((j) => j.recus)}
              delta={recusAujourdhui - recusHier}
            />
            <Tuile
              titre="Pièces jointes (7 jours)"
              valeur={donnees.fichiers_7j}
              sous="Envoyées et reçues"
              icone={FolderOpen}
              teinte="violet"
              actif={donnees.fichiers_7j > 0}
              to="/documents"
            />
          </div>

          {/* 2. Vue d'ensemble de l'entreprise (administrateur) */}
          {estAdmin && (
            <section className="shrink-0" aria-label="Administration">
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Vue d'ensemble de l'entreprise</h2>
              <div className={`grid gap-px overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100 sm:grid-cols-2 xl:grid-cols-5 ${OMBRE}`}>
                <StatAdmin titre="Comptes actifs" valeur={donnees.admin.utilisateurs_actifs} icone={UserCheck} teinte="vert" />
                <StatAdmin titre="Comptes désactivés" valeur={donnees.admin.utilisateurs_desactives} icone={UserX} teinte="gris" />
                <StatAdmin titre="Services" valeur={donnees.admin.services} icone={Building2} teinte="violet" />
                <StatAdmin titre="Connexions (24 h)" valeur={donnees.admin.connexions_24h} icone={LogIn} teinte="bleu" />
                <StatAdmin
                  titre="Échecs de connexion (24 h)"
                  valeur={donnees.admin.echecs_connexion_24h}
                  icone={ShieldAlert}
                  teinte={donnees.admin.echecs_connexion_24h > 0 ? 'rouge' : 'gris'}
                  alerte={donnees.admin.echecs_connexion_24h > 0}
                  className="sm:col-span-2 xl:col-span-1"
                />
              </div>
            </section>
          )}

          {/* 3. Activité (priorité) */}
          {blocActivite}

          {/* 4. À lire / À traiter / Pièces jointes */}
          {blocCartes}
        </>
      )}
    </div>
  )
}
