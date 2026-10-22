import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Loader2,
  Search,
  Undo2,
  X,
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../AuthContext'
import { Avatar } from '../components/ui'
import { messageErreur } from '../utils'

/* ============================================================
   Configuration
   ============================================================ */
const FILTRES = [
  { id: 'tout', libelle: 'Tout' },
  { id: 'urgent', libelle: 'Urgent' },
  { id: 'action', libelle: 'Action requise' },
  { id: 'retard', libelle: 'En retard' },
]

const TRIS = [
  { id: 'echeance', libelle: 'Par échéance' },
  { id: 'recent', libelle: 'Plus récent' },
]

const SECTIONS = [
  { id: 'retard', libelle: 'En retard', ton: 'text-red-700' },
  { id: 'aujourdhui', libelle: "Pour aujourd'hui", ton: 'text-amber-700' },
  { id: 'semaine', libelle: 'Cette semaine', ton: 'text-slate-700' },
  { id: 'plus_tard', libelle: 'Plus tard', ton: 'text-slate-700' },
  { id: 'sans', libelle: 'Sans échéance', ton: 'text-slate-600' },
]

const DELAI_ANNULATION = 5000
const INTERVALLE_ACTUALISATION = 15_000

/* ============================================================
   Utilitaires
   ============================================================ */
function normaliser(s) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function pluriel(n, mot, motPluriel) {
  return `${n} ${n > 1 ? (motPluriel ?? `${mot}s`) : mot}`
}

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

function dureeLisible(ms) {
  const min = Math.max(1, Math.round(Math.abs(ms) / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  return `${Math.round(h / 24)} j`
}

function estEnRetard(a, maintenant) {
  return Boolean(a.en_retard) || (a.echeance && new Date(a.echeance) < maintenant)
}

function sectionDe(a, maintenant) {
  if (estEnRetard(a, maintenant)) return 'retard'
  if (!a.echeance) return 'sans'
  const echeance = new Date(a.echeance)
  const finJournee = new Date(maintenant)
  finJournee.setHours(23, 59, 59, 999)
  if (echeance <= finJournee) return 'aujourdhui'
  if (echeance - maintenant < 7 * 86400000) return 'semaine'
  return 'plus_tard'
}

/** Priorité : urgent d'abord, puis échéance la plus proche, puis message le plus ancien. */
function comparerPriorite(a, b) {
  const urgentA = a.categorie === 'URGENT' ? 0 : 1
  const urgentB = b.categorie === 'URGENT' ? 0 : 1
  if (urgentA !== urgentB) return urgentA - urgentB
  const eA = a.echeance ? new Date(a.echeance).getTime() : Infinity
  const eB = b.echeance ? new Date(b.echeance).getTime() : Infinity
  if (eA !== eB) return eA - eB
  return new Date(a.date_envoi) - new Date(b.date_envoi)
}

function correspondFiltre(a, filtre, maintenant) {
  if (filtre === 'urgent') return a.categorie === 'URGENT'
  if (filtre === 'action') return a.categorie === 'ACTION_REQUISE'
  if (filtre === 'retard') return estEnRetard(a, maintenant)
  return true
}

/* ============================================================
   Page
   ============================================================ */
export default function ATraiter() {
  const { utilisateur } = useAuth()
  const navigate = useNavigate()

  const [actions, setActions] = useState([])
  const [enAttente, setEnAttente] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [actualisation, setActualisation] = useState(false)
  const [erreur, setErreur] = useState('')
  const [filtre, setFiltre] = useState('tout')
  const [tri, setTri] = useState('echeance')
  const [recherche, setRecherche] = useState('')
  const [enCours, setEnCours] = useState(null)
  const [maintenant, setMaintenant] = useState(() => new Date())
  const [selection, setSelection] = useState(null)

  // Actions terminées en attente de validation (annulables pendant quelques secondes)
  const [masquees, setMasquees] = useState(() => new Set())
  const [toasts, setToasts] = useState([])
  const enAttenteValidation = useRef(new Map())
  const champRecherche = useRef(null)

  /* ---------- Chargement ---------- */
  const charger = useCallback(async ({ silencieux = false } = {}) => {
    if (silencieux) setActualisation(true)
    else setChargement(true)
    if (!silencieux) setErreur('')
    try {
      const { data } = await api.get('/api/actions')
      setActions(data.actions ?? [])
      setEnAttente(data.en_attente ?? 0)
      if (silencieux) setErreur('')
    } catch (e) {
      if (!silencieux) {
        setActions([])
        setEnAttente(0)
      }
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
      setActualisation(false)
      setMaintenant(new Date())
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  /* ---------- Actualisation auto (15 s + retour sur l'onglet) ---------- */
  useEffect(() => {
    const actualiser = () => {
      if (document.visibilityState === 'visible') charger({ silencieux: true })
    }
    const timer = setInterval(actualiser, INTERVALLE_ACTUALISATION)
    document.addEventListener('visibilitychange', actualiser)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', actualiser)
    }
  }, [charger])

  // À la fermeture de la page, on valide ce qui était encore annulable
  useEffect(() => {
    const file = enAttenteValidation.current
    return () => {
      for (const { timer, action, statut } of file.values()) {
        clearTimeout(timer)
        api.post(`/api/messages/${action.reference_message}/prise-en-compte`, { statut }).catch(() => {})
      }
      file.clear()
    }
  }, [])

  /* ---------- Données dérivées ---------- */
  const actives = useMemo(
    () => actions.filter((a) => !masquees.has(a.reference_message)),
    [actions, masquees]
  )

  const compteurs = useMemo(() => {
    const res = {}
    for (const f of FILTRES) {
      res[f.id] = actives.filter((a) => correspondFiltre(a, f.id, maintenant)).length
    }
    return res
  }, [actives, maintenant])

  const visibles = useMemo(() => {
    const terme = normaliser(recherche.trim())
    return actives
      .filter((a) => correspondFiltre(a, filtre, maintenant))
      .filter((a) => {
        if (!terme) return true
        const texte = normaliser(
          `${a.expediteur?.prenom ?? ''} ${a.expediteur?.nom ?? ''} ${a.apercu ?? ''} ${a.conversation?.titre ?? ''}`
        )
        return texte.includes(terme)
      })
  }, [actives, filtre, recherche, maintenant])

  // Sections (tri par échéance) ou liste plate (plus récent)
  const sections = useMemo(() => {
    if (tri === 'recent') {
      const liste = [...visibles].sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi))
      return liste.length ? [{ id: 'recent', libelle: null, ton: '', items: liste }] : []
    }
    return SECTIONS.map((s) => ({
      ...s,
      items: visibles.filter((a) => sectionDe(a, maintenant) === s.id).sort(comparerPriorite),
    })).filter((s) => s.items.length > 0)
  }, [visibles, tri, maintenant])

  const ordonnees = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const premiereRef =
    tri === 'echeance' && filtre === 'tout' && !recherche.trim()
      ? ordonnees[0]?.reference_message
      : null

  const restantes = Math.max(0, enAttente - masquees.size)
  const nbRetard = compteurs.retard
  const nbUrgent = compteurs.urgent
  const nbAujourdhui = actives.filter((a) => sectionDe(a, maintenant) === 'aujourdhui').length

  /* ---------- Actions ---------- */
  function retirerToast(ref) {
    setToasts((t) => t.filter((x) => x.ref !== ref))
  }

  async function valider(ref) {
    const entree = enAttenteValidation.current.get(ref)
    if (!entree) return
    enAttenteValidation.current.delete(ref)
    retirerToast(ref)
    try {
      await api.post(`/api/messages/${ref}/prise-en-compte`, { statut: entree.statut })
      setActions((actuelles) => actuelles.filter((a) => a.reference_message !== ref))
      setEnAttente((n) => Math.max(0, n - 1))
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setMasquees((m) => {
        const suivant = new Set(m)
        suivant.delete(ref)
        return suivant
      })
    }
  }

  function annuler(ref) {
    const entree = enAttenteValidation.current.get(ref)
    if (!entree) return
    clearTimeout(entree.timer)
    enAttenteValidation.current.delete(ref)
    retirerToast(ref)
    setMasquees((m) => {
      const suivant = new Set(m)
      suivant.delete(ref)
      return suivant
    })
  }

  async function accuser(action, statut) {
    const ref = action.reference_message
    if (enAttenteValidation.current.has(ref) || enCours === ref) return
    setErreur('')

    const termine = statut === 'FAIT' || action.categorie === 'URGENT'

    if (termine) {
      // L'action disparaît tout de suite ; l'envoi réel part après 5 s, sauf si on annule
      setMasquees((m) => new Set(m).add(ref))
      setToasts((t) => [
        ...t,
        { ref, texte: statut === 'FAIT' ? 'Marquée comme faite' : 'Prise en compte' },
      ])
      const timer = setTimeout(() => valider(ref), DELAI_ANNULATION)
      enAttenteValidation.current.set(ref, { timer, action, statut })
      return
    }

    // Prise en compte d'une action non urgente : elle reste dans la liste
    const precedent = action.etat
    setEnCours(ref)
    setActions((actuelles) =>
      actuelles.map((a) => (a.reference_message === ref ? { ...a, etat: statut } : a))
    )
    try {
      await api.post(`/api/messages/${ref}/prise-en-compte`, { statut })
    } catch (e) {
      setErreur(messageErreur(e))
      setActions((actuelles) =>
        actuelles.map((a) => (a.reference_message === ref ? { ...a, etat: precedent } : a))
      )
    } finally {
      setEnCours(null)
    }
  }

  /* ---------- Raccourcis clavier : J/K, P, F, Entrée, / ---------- */
  const accuserRef = useRef(accuser)
  accuserRef.current = accuser

  useEffect(() => {
    function surTouche(e) {
      const cible = e.target
      const saisie = ['INPUT', 'SELECT', 'TEXTAREA'].includes(cible.tagName) || cible.isContentEditable
      if (saisie || e.ctrlKey || e.metaKey || e.altKey) return

      const index = ordonnees.findIndex((a) => a.reference_message === selection)
      const courante = index >= 0 ? ordonnees[index] : null

      switch (e.key.toLowerCase()) {
        case '/':
          e.preventDefault()
          champRecherche.current?.focus()
          break
        case 'j':
          e.preventDefault()
          setSelection(ordonnees[Math.min(index + 1, ordonnees.length - 1)]?.reference_message ?? null)
          break
        case 'k':
          e.preventDefault()
          setSelection(ordonnees[Math.max(index - 1, 0)]?.reference_message ?? null)
          break
        case 'p':
          if (courante && courante.etat !== 'PRIS_EN_COMPTE') accuserRef.current(courante, 'PRIS_EN_COMPTE')
          break
        case 'f':
          if (courante && courante.categorie !== 'URGENT') accuserRef.current(courante, 'FAIT')
          break
        case 'enter':
          if (courante) navigate(`/conversations/${courante.conversation.reference_conversation}`)
          break
        default:
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [ordonnees, selection, navigate])

  // Fait défiler jusqu'à la carte sélectionnée
  useEffect(() => {
    if (selection) {
      document
        .getElementById(`action-${selection}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selection])

  const filtreActif = filtre !== 'tout' || recherche.trim() !== ''

  /* ---------- Rendu ---------- */
  return (
    // ✅ Suppression totale du padding-top
    <div className="w-full pb-24">
      
      {/* ✅ En-tête avec les compteurs : caché s'il n'y a rien à afficher */}
      {(nbRetard > 0 || nbUrgent > 0 || nbAujourdhui > 0) && (
        <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4 md:px-6">
          <div className="flex flex-wrap gap-2">
            {nbRetard > 0 && (
              <button
                type="button"
                onClick={() => setFiltre('retard')}
                className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 focus-visible:outline-2 focus-visible:outline-red-600"
              >
                {pluriel(nbRetard, 'en retard', 'en retard')}
              </button>
            )}
            {nbUrgent > 0 && (
              <button
                type="button"
                onClick={() => setFiltre('urgent')}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-amber-600"
              >
                {pluriel(nbUrgent, 'urgent')}
              </button>
            )}
            {nbAujourdhui > 0 && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {pluriel(nbAujourdhui, 'échéance')} aujourd’hui
              </span>
            )}
          </div>
        </header>
      )}

      {/* ✅ Barre d'outils sticky collée en haut (plus de marge) */}
      <div className="sticky top-0 z-10 mb-5 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les actions">
          {FILTRES.map((f) => {
            const actif = filtre === f.id
            const compte = compteurs[f.id]
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
                  <span className={`ml-1.5 ${actif ? 'text-white/80' : 'text-slate-500'}`}>{compte}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative min-w-52 flex-1 md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={champRecherche}
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setRecherche('')
                e.currentTarget.blur()
              }
            }}
            placeholder="Rechercher un expéditeur, un sujet…   ( / )"
            aria-label="Rechercher dans les actions"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-indigo-600"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche('')}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Effacer la recherche"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Ordre d'affichage"
          className="ml-auto inline-flex rounded-xl bg-slate-100 p-1"
        >
          {TRIS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tri === t.id}
              onClick={() => setTri(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                tri === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.libelle}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {erreur && (
        <div
          className="mb-4 mx-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 md:mx-6"
          role="alert"
        >
          <span>{erreur}</span>
          <button
            type="button"
            onClick={() => charger()}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      <div className="px-4 md:px-6">
        {chargement ? (
          <div
            className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Chargement…
          </div>
        ) : ordonnees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <ClipboardCheck className="mx-auto size-10 text-emerald-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              {filtreActif ? 'Aucune action ne correspond' : 'Tout est à jour'}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {filtreActif
                ? 'Essayez un autre filtre ou une autre recherche.'
                : 'Aucun message ne requiert votre attention.'}
            </p>
            {filtreActif && (
              <button
                type="button"
                onClick={() => {
                  setFiltre('tout')
                  setRecherche('')
                }}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((s) => (
              <section key={s.id} aria-label={s.libelle ?? 'Actions'}>
                {s.libelle && (
                  <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${s.ton}`}>
                    {s.libelle}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {s.items.length}
                    </span>
                  </h3>
                )}
                <ul className="space-y-2.5">
                  {s.items.map((a) => (
                    <CarteAction
                      key={a.reference_message}
                      action={a}
                      maintenant={maintenant}
                      moi={utilisateur}
                      selectionnee={selection === a.reference_message}
                      prioritaire={premiereRef === a.reference_message}
                      enCours={enCours === a.reference_message}
                      onSelect={() => setSelection(a.reference_message)}
                      onAccuser={accuser}
                    />
                  ))}
                </ul>
              </section>
            ))}

            <p className="hidden text-xs text-slate-500 lg:block">
              Raccourcis : <kbd className="rounded border border-slate-300 px-1">J</kbd> /{' '}
              <kbd className="rounded border border-slate-300 px-1">K</kbd> naviguer,{' '}
              <kbd className="rounded border border-slate-300 px-1">P</kbd> pris en compte,{' '}
              <kbd className="rounded border border-slate-300 px-1">F</kbd> fait,{' '}
              <kbd className="rounded border border-slate-300 px-1">Entrée</kbd> ouvrir,{' '}
              <kbd className="rounded border border-slate-300 px-1">/</kbd> rechercher.
            </p>
          </div>
        )}
      </div>

      {/* Confirmations annulables */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-3"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.ref}
            className="pointer-events-auto flex items-center gap-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg"
          >
            <span>{t.texte}</span>
            <button
              type="button"
              onClick={() => annuler(t.ref)}
              className="inline-flex items-center gap-1.5 font-semibold text-indigo-300 hover:text-indigo-200 focus-visible:outline-2 focus-visible:outline-indigo-300"
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Annuler
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
   Carte d'une action
   ============================================================ */
function CarteAction({
  action: a,
  maintenant,
  selectionnee,
  prioritaire,
  enCours,
  onSelect,
  onAccuser,
}) {
  const urgent = a.categorie === 'URGENT'
  const dejaPris = a.etat === 'PRIS_EN_COMPTE'
  const enRetard = estEnRetard(a, maintenant)

  const styles = urgent
    ? { badge: 'bg-red-100 text-red-700', barre: 'bg-red-500', icone: AlertTriangle, libelle: 'Urgent' }
    : {
        badge: 'bg-amber-100 text-amber-700',
        barre: 'bg-amber-400',
        icone: ClipboardCheck,
        libelle: 'Action requise',
      }
  const Icone = styles.icone

  // Échéance lisible : « En retard de 2 j », « Dans 3 h »
  let delai = null
  if (a.echeance) {
    const diff = new Date(a.echeance) - maintenant
    delai =
      diff < 0
        ? { texte: `En retard de ${dureeLisible(diff)}`, ton: 'text-red-700 font-semibold' }
        : {
            texte: `Dans ${dureeLisible(diff)}`,
            ton: diff < 86400000 ? 'text-amber-700 font-semibold' : 'text-slate-600',
          }
  }

  return (
    <li
      id={`action-${a.reference_message}`}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
        enRetard ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
      } ${selectionnee ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${enRetard ? 'bg-red-500' : styles.barre}`} aria-hidden="true" />

      <div className="flex flex-col gap-4 py-4 pl-5 pr-4 lg:flex-row lg:items-center">
        {/* Gauche : expéditeur + contenu */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar
            prenom={a.expediteur?.prenom}
            nom={a.expediteur?.nom}
            photoUrl={a.expediteur?.photo_url}
            taille="sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {prioritaire && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                  À faire en premier
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}
              >
                <Icone className="size-3" aria-hidden="true" />
                {styles.libelle}
              </span>
              {dejaPris && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  <Check className="size-3" aria-hidden="true" />
                  Pris en compte
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm text-slate-800">
              <span className="font-semibold">
                {a.expediteur?.prenom} {a.expediteur?.nom}
              </span>
              <span className="text-slate-500"> – {formaterDateRelative(a.date_envoi)}</span>
            </p>

            <p className="mt-1.5 line-clamp-2 text-sm text-slate-700">{a.apercu}</p>

            <Link
              to={`/conversations/${a.conversation.reference_conversation}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              {a.conversation.titre}
              <ExternalLink className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Centre : échéance */}
        {a.echeance && (
          <div className="shrink-0 text-sm lg:w-52 lg:text-right">
            <p className={`inline-flex items-center gap-1.5 ${delai.ton}`}>
              <Clock className="size-4" aria-hidden="true" />
              {delai.texte}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Échéance : {formaterEcheance(a.echeance)}</p>
          </div>
        )}

        {/* Droite : actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {dejaPris ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <Check className="size-3.5" aria-hidden="true" />
              Pris en compte
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAccuser(a, 'PRIS_EN_COMPTE')
              }}
              disabled={enCours}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
              onClick={(e) => {
                e.stopPropagation()
                onAccuser(a, 'FAIT')
              }}
              disabled={enCours}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Marquer comme fait
            </button>
          )}
        </div>
      </div>
    </li>
  )
}