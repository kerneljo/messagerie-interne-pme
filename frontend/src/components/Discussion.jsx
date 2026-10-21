import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ChevronDown, ChevronUp, Paperclip, Pencil, Reply,
  Search, SendHorizontal, X, Smile,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'
import useConversationTempsReel from '../conversationTempsReel'
import useSignalerFrappe from '../signalerFrappe'
import { libelleJour, messageErreur, tailleLisible } from '../utils'
import { Avatar, Bouton } from './ui'
import EmojiPicker, { LARGEUR_PICKER, HAUTEUR_PICKER } from './EmojiPicker'
import Bulle, { BulleAnimee } from './Bulle'
import FondDiscussion from './FondDiscussion'
import NotificationsMenu from './NotificationsMenu'
import ParametresGroupe from './ParametresGroupe' // ← AJOUT
import {
  avecAccuse, BandeauEngagement, EtiquetteCategorie,
  minEcheanceLocale, PanneauSuivi, PanneauVersions, SelecteurCategorie,
} from './SuiviMessage'

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const EXTENSIONS = new Set(TYPES_ACCEPTES.split(',').map((e) => e.slice(1)))
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024
const MAX_CARACTERES = 5000
const MAX_REACTIONS_PAR_USER = 3
const HAUTEUR_MAX_TEXTAREA = 200

const DELAI_GROUPE_MS = 5 * 60 * 1000
const DISTANCE_BOUTON_BAS = 200
const DECALAGE_SEPARATEUR = 76
const HAUTEUR_BARRE_RECHERCHE = 48
const MASQUE_BAS = 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)'

function extension(nom) {
  return nom.includes('.') ? nom.split('.').pop().toLowerCase() : ''
}

function fusionner(anciens, nouveaux) {
  if (nouveaux.length === 0) return []
  const min = nouveaux[0].reference_message
  return [...anciens.filter((m) => m.reference_message < min), ...nouveaux]
}

function normaliser(s) {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function PointsEcriture() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-slate-400"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

export default function Discussion({ conversation, onLu, onRetour }) {
  const { utilisateur } = useAuth()
  const ref = conversation.reference_conversation

  // ↓ AJOUT : état pour ouvrir les paramètres du groupe
  const [parametresOuverts, setParametresOuverts] = useState(false)

  const [messages, setMessages] = useState([])
  const [peutPlus, setPeutPlus] = useState(false)
  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [reponseA, setReponseA] = useState(null)
  const [edition, setEdition] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [survol, setSurvol] = useState(false)

  const [categorie, setCategorie] = useState('NORMAL')
  const [echeance, setEcheance] = useState('')

  const [suiviPour, setSuiviPour] = useState(null)
  const [versionsPour, setVersionsPour] = useState(null)
  const [accuseEnCours, setAccuseEnCours] = useState(null)

  const [loin, setLoin] = useState(false)
  const [nouveaux, setNouveaux] = useState(0)

  const [rechercheOuverte, setRechercheOuverte] = useState(false)
  const [requete, setRequete] = useState('')
  const [decalage, setDecalage] = useState(0)

  const [pickerSaisieOuvert, setPickerSaisieOuvert] = useState(false)
  const [pickerSaisieCoords, setPickerSaisieCoords] = useState({ bottom: 0, left: 0 })

  const [pickerPour, setPickerPour] = useState(null)
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 })

  const zone = useRef(null)
  const textareaRef = useRef(null)
  const boutonEmojiRef = useRef(null)
  const champRechercheRef = useRef(null)
  const coller = useRef(true)
  const premiere = useRef(true)
  const chargementInitial = useRef(true)
  const derniereRef = useRef(null)

  const peutEcrire =
    conversation.type !== 'DIFFUSION' ||
    conversation.matricule_createur === utilisateur.matricule

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/conversations/${ref}/messages`)
      const tries = [...(data.messages || [])].sort((a, b) => {
        const dateA = new Date(a.date_envoi).getTime()
        const dateB = new Date(b.date_envoi).getTime()
        if (dateA !== dateB) return dateA - dateB
        return a.reference_message - b.reference_message
      })
      setMessages((actuels) => fusionner(actuels, tries))
      if (premiere.current) {
        setPeutPlus(data.peut_charger_plus)
        premiere.current = false
      }

      const nonLus = tries.some((m) => !m.lu_par_moi && m.expediteur?.matricule !== utilisateur.matricule)
      if (nonLus && !document.hidden) {
        await api.post(`/api/conversations/${ref}/lu`)
        onLu?.()
      }
    } catch {
      // erreur réseau ponctuelle
    }
  }, [ref, utilisateur.matricule, onLu])

  useEffect(() => {
    charger()
  }, [charger])

  const { typingUsers } = useConversationTempsReel(
    ref,
    (nouveau) => {
      setMessages((actuels) => {
        if (actuels.some((m) => m.reference_message === nouveau.reference_message)) {
          return actuels
        }
        return [...actuels, nouveau]
      })
    },
    utilisateur.matricule,
  )

  const signalerFrappe = useSignalerFrappe(ref)

  const q = normaliser(requete.trim())

  const resultats = useMemo(
    () => (q ? messages.filter((m) => normaliser(m.contenu).includes(q)).map((m) => m.reference_message) : []),
    [messages, q],
  )
  const ensembleResultats = useMemo(() => new Set(resultats), [resultats])
  const position = resultats.length > 0 ? Math.min(decalage, resultats.length - 1) : 0
  const courant = resultats.length > 0 ? resultats[resultats.length - 1 - position] : null

  useEffect(() => {
    if (courant === null) return
    const zoneEl = zone.current
    const el = document.getElementById(`msg-${courant}`)
    if (!zoneEl || !el) return
    coller.current = false
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const r = el.getBoundingClientRect()
    const rz = zoneEl.getBoundingClientRect()
    const cible = zoneEl.scrollTop + (r.top - rz.top) - zoneEl.clientHeight / 2 + r.height / 2
    zoneEl.scrollTo({ top: Math.max(0, cible), behavior: reduit ? 'auto' : 'smooth' })
  }, [courant])

  useEffect(() => {
    if (rechercheOuverte) champRechercheRef.current?.focus()
  }, [rechercheOuverte])

  function fermerRecherche() {
    setRechercheOuverte(false)
    setRequete('')
    setDecalage(0)
  }

  function basculerRecherche() {
    if (rechercheOuverte) fermerRecherche()
    else setRechercheOuverte(true)
  }

  function allerResultat(sens) {
    if (resultats.length === 0) return
    setDecalage((d) => {
      const base = Math.min(d, resultats.length - 1)
      return (base + sens + resultats.length) % resultats.length
    })
  }

  function surToucheRecherche(e) {
    if (e.nativeEvent?.isComposing) return
    if (e.key === 'Escape') {
      e.preventDefault()
      fermerRecherche()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      allerResultat(e.shiftKey ? -1 : 1)
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, HAUTEUR_MAX_TEXTAREA) + 'px'
  }, [texte])

  useEffect(() => {
    const el = zone.current
    if (el && coller.current) el.scrollTop = el.scrollHeight

    const dernier = messages[messages.length - 1]
    if (!dernier) return

    if (derniereRef.current !== null && !coller.current) {
      const nb = messages.filter(
        (m) =>
          m.reference_message > derniereRef.current &&
          m.expediteur?.matricule !== utilisateur.matricule,
      ).length
      if (nb > 0) setNouveaux((n) => n + nb)
    }
    derniereRef.current = Math.max(derniereRef.current ?? 0, dernier.reference_message)

    chargementInitial.current = false
  }, [messages, utilisateur.matricule])

  function surDefilement() {
    const el = zone.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    coller.current = distance < 80
    setLoin(distance > DISTANCE_BOUTON_BAS)
    if (distance < 80) setNouveaux(0)
  }

  function descendre() {
    const el = zone.current
    if (!el) return
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: el.scrollHeight, behavior: reduit ? 'auto' : 'smooth' })
    setNouveaux(0)
  }

  async function chargerPlus() {
    try {
      const { data } = await api.get(`/api/conversations/${ref}/messages`, {
        params: { avant: messages[0].reference_message },
      })
      const tries = [...(data.messages || [])].sort((a, b) => {
        const dateA = new Date(a.date_envoi).getTime()
        const dateB = new Date(b.date_envoi).getTime()
        return dateA - dateB
      })
      setMessages((actuels) => [...tries, ...actuels])
      setPeutPlus(data.peut_charger_plus)
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  function ajouter(liste) {
    if (liste.length === 0) return
    const total = [...fichiers, ...liste]
    if (total.length > MAX_FICHIERS) {
      setErreur(`${MAX_FICHIERS} fichiers maximum par message.`)
      return
    }
    const interdit = liste.find((f) => !EXTENSIONS.has(extension(f.name)))
    if (interdit) {
      setErreur(`Format non accepté : ${interdit.name}`)
      return
    }
    const trop = total.find((f) => f.size > MAX_OCTETS)
    if (trop) {
      setErreur(`${trop.name} dépasse 10 Mo.`)
      return
    }
    setErreur('')
    setFichiers(total)
  }

  function surChoixFichiers(e) {
    const choisis = Array.from(e.target.files)
    e.target.value = ''
    ajouter(choisis)
  }

  function surDepot(e) {
    e.preventDefault()
    setSurvol(false)
    if (edition) return
    ajouter(Array.from(e.dataTransfer.files))
  }

  function surColler(e) {
    const collés = Array.from(e.clipboardData?.files ?? [])
    if (collés.length > 0 && !edition) {
      e.preventDefault()
      ajouter(collés)
    }
  }

  async function envoyer() {
    const contenu = texte.trim()
    if (edition && !contenu) {
      setErreur('Le message ne peut pas être vide.')
      return
    }
    if (!contenu && fichiers.length === 0) return

    setEnvoi(true)
    setErreur('')
    try {
      if (edition) {
        await api.patch(`/api/messages/${edition.reference_message}`, { contenu })
        setEdition(null)
      } else {
        const donnees = new FormData()
        if (contenu) donnees.append('contenu', contenu)
        if (reponseA) donnees.append('reference_message_parent', reponseA.reference_message)
        if (categorie !== 'NORMAL') donnees.append('categorie', categorie)
        if (avecAccuse(categorie) && echeance) {
          donnees.append('echeance', new Date(echeance).toISOString())
        }
        fichiers.forEach((f) => donnees.append('fichiers[]', f))
        await api.post(`/api/conversations/${ref}/messages`, donnees)
        setFichiers([])
        setReponseA(null)
        setCategorie('NORMAL')
        setEcheance('')
      }
      setTexte('')
      coller.current = true
      await charger()
      onLu?.()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setEnvoi(false)
    }
  }

  async function supprimer(m) {
    try {
      setMessages((actuels) => actuels.filter((x) => x.reference_message !== m.reference_message))
      await api.delete(`/api/messages/${m.reference_message}`)
      await charger()
    } catch (e) {
      setErreur(messageErreur(e))
      await charger()
    }
  }

  function modifier(m) {
    setEdition(m)
    setReponseA(null)
    setFichiers([])
    setTexte(m.contenu ?? '')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function accuser(m, statut) {
    if (accuseEnCours !== null) return
    setAccuseEnCours(m.reference_message)
    setErreur('')
    try {
      const { data } = await api.post(`/api/messages/${m.reference_message}/prise-en-compte`, { statut })
      setMessages((actuels) =>
        actuels.map((x) =>
          x.reference_message === m.reference_message
            ? { ...x, ma_prise_en_compte: data.ma_prise_en_compte, lu_par_moi: true }
            : x
        )
      )
      onLu?.()
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setAccuseEnCours(null)
    }
  }

  function majSuivi(reference, resume) {
    setMessages((actuels) =>
      actuels.map((x) => (x.reference_message === reference ? { ...x, suivi: resume } : x))
    )
  }

  function reagir(m, emoji) {
    setMessages((actuels) =>
      actuels.map((msg) => {
        if (msg.reference_message !== m.reference_message) return msg
        const reactions = [...(msg.reactions || [])]
        const idx = reactions.findIndex((r) => r.emoji === emoji)

        if (idx >= 0) {
          const r = reactions[idx]
          if (r.moi) {
            if (r.nb === 1) reactions.splice(idx, 1)
            else reactions[idx] = { ...r, nb: r.nb - 1, moi: false }
          } else {
            reactions[idx] = { ...r, nb: r.nb + 1, moi: true }
          }
        } else {
          const mesReactions = reactions.filter((r) => r.moi)
          if (mesReactions.length >= MAX_REACTIONS_PAR_USER) {
            const idxPlusAncienne = reactions.findIndex((r) => r.moi)
            if (idxPlusAncienne >= 0) {
              const ancienne = reactions[idxPlusAncienne]
              if (ancienne.nb === 1) reactions.splice(idxPlusAncienne, 1)
              else reactions[idxPlusAncienne] = { ...ancienne, nb: ancienne.nb - 1, moi: false }
            }
          }
          reactions.push({ emoji, nb: 1, moi: true })
        }
        return { ...msg, reactions }
      })
    )

    api.post(`/api/messages/${m.reference_message}/reactions`, { emoji })
      .then(({ data }) => {
        setMessages((actuels) =>
          actuels.map((msg) =>
            msg.reference_message === m.reference_message
              ? { ...msg, reactions: data.reactions }
              : msg
          )
        )
      })
      .catch(() => charger())
  }

  function ouvrirPickerEmoji(m, rect) {
    if (!rect) return
    const moi = m.expediteur?.matricule === utilisateur.matricule

    let top = rect.top >= HAUTEUR_PICKER + 16 ? rect.top - HAUTEUR_PICKER - 8 : rect.bottom + 8
    top = Math.max(8, Math.min(top, window.innerHeight - HAUTEUR_PICKER - 8))

    let left = moi ? rect.right - LARGEUR_PICKER : rect.left
    left = Math.max(8, Math.min(left, window.innerWidth - LARGEUR_PICKER - 8))

    setPickerCoords({ top, left })
    setPickerPour(m)
  }

  function basculerPickerSaisie() {
    if (pickerSaisieOuvert) {
      setPickerSaisieOuvert(false)
      return
    }
    const rect = boutonEmojiRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - LARGEUR_PICKER - 8))
    setPickerSaisieCoords({ bottom: window.innerHeight - rect.top + 8, left })
    setPickerSaisieOuvert(true)
  }

  function insererEmoji(emoji) {
    const el = textareaRef.current
    const debut = el?.selectionStart ?? texte.length
    const fin = el?.selectionEnd ?? texte.length
    const nouveau = texte.slice(0, debut) + emoji + texte.slice(fin)
    if (nouveau.length > MAX_CARACTERES) return
    setTexte(nouveau)
    signalerFrappe()
    requestAnimationFrame(() => {
      el?.focus()
      const position = debut + emoji.length
      el?.setSelectionRange(position, position)
    })
  }

  function annulerContexte() {
    setEdition(null)
    setReponseA(null)
    setTexte('')
  }

  function surTouche(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault()
      envoyer()
    }
  }

  function changerCategorie(nouvelle) {
    setCategorie(nouvelle)
    if (!avecAccuse(nouvelle)) setEcheance('')
  }

  const autre = conversation.participants.find((p) => p.matricule !== utilisateur.matricule)
  const sousTitre =
    conversation.type === 'DIRECT'
      ? autre?.poste
      : `${conversation.participants.length} participants · ${conversation.participants.map((p) => p.prenom).join(', ')}`

  const peutEnvoyer = !envoi && (texte.trim() !== '' || fichiers.length > 0)
  const boutonBas = loin || nouveaux > 0

  const parJour = new Map()
  messages.forEach((m) => {
    const cle = new Date(m.date_envoi).toDateString()
    if (!parJour.has(cle)) parJour.set(cle, { cle, label: libelleJour(m.date_envoi), messages: [] })
    parJour.get(cle).messages.push(m)
  })
  const jours = [...parJour.values()].map((j) => ({
    ...j,
    items: j.messages.map((m, i) => {
      const prec = j.messages[i - 1]
      const premier =
        !prec ||
        prec.expediteur?.matricule !== m.expediteur?.matricule ||
        new Date(m.date_envoi) - new Date(prec.date_envoi) > DELAI_GROUPE_MS
      return { m, premier, debutJour: i === 0 }
    }),
  }))

  // ↓ AJOUT : si les paramètres sont ouverts, on affiche la page à la place
  if (parametresOuverts && conversation.type === 'GROUPE') {
    return (
      <ParametresGroupe
        conversation={conversation}
        onRetour={() => setParametresOuverts(false)}
      />
    )
  }

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden">
      <FondDiscussion className="pointer-events-none absolute inset-0 -z-10 size-full" />

      {/* ===== En-tête ===== */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-papier/90 px-4 backdrop-blur-xl md:px-6">
        <button
          type="button"
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-900/5 md:hidden"
          onClick={onRetour}
          aria-label="Retour à la liste"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          {conversation.type === 'DIRECT' && autre?.matricule ? (
            <Link
              to={`/utilisateurs/${autre.matricule}`}
              className="-mx-2 flex min-w-0 items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-slate-900/5"
            >
              <Avatar prenom={autre.prenom} nom={autre.nom} photoUrl={autre.photo_url} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight text-slate-900">{conversation.titre}</h2>
                {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
              </div>
            </Link>
          ) : conversation.type === 'GROUPE' ? (
            /* ↓ En-tête cliquable pour les groupes */
            <button
              type="button"
              onClick={() => setParametresOuverts(true)}
              className="-mx-2 flex min-w-0 items-center gap-3 rounded-lg px-2 py-1 text-left transition hover:bg-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon-600"
              aria-label={`Ouvrir les paramètres du groupe ${conversation.titre}`}
            >
              <Avatar prenom={conversation.titre} nom="" photoUrl={conversation.photo_url} />
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight text-slate-900">{conversation.titre}</h2>
                {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
              </div>
            </button>
          ) : (
            <>
              <Avatar prenom={conversation.titre} nom="" />
              <div className="min-w-0">
                <h2 className="truncate font-semibold leading-tight text-slate-900">{conversation.titre}</h2>
                {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={basculerRecherche}
          aria-label="Rechercher dans la conversation"
          aria-expanded={rechercheOuverte}
          title="Rechercher dans la conversation"
          className={`flex size-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon-600 ${
            rechercheOuverte
              ? 'bg-slate-200 text-slate-900'
              : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900'
          }`}
        >
          <Search className="size-[18px]" />
        </button>

        <NotificationsMenu />
      </header>

      {/* ===== Barre de recherche ===== */}
      <AnimatePresence>
        {rechercheOuverte && (
          <motion.div
            key="recherche"
            role="search"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-x-0 top-16 z-20 flex items-center gap-2 border-b border-slate-200/70 bg-papier/90 px-4 backdrop-blur-xl md:px-6"
            style={{ height: HAUTEUR_BARRE_RECHERCHE }}
          >
            <Search className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              ref={champRechercheRef}
              type="text"
              value={requete}
              onChange={(e) => {
                setRequete(e.target.value)
                setDecalage(0)
              }}
              onKeyDown={surToucheRecherche}
              placeholder="Rechercher dans la conversation…"
              aria-label="Rechercher dans la conversation"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
            />
            <span className="shrink-0 text-xs tabular-nums text-slate-500" aria-live="polite">
              {q ? (resultats.length > 0 ? `${resultats.length - position} / ${resultats.length}` : 'Aucun résultat') : ''}
            </span>
            <button
              type="button"
              onClick={() => allerResultat(1)}
              disabled={resultats.length === 0}
              aria-label="Résultat précédent"
              title="Plus ancien (Entrée)"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => allerResultat(-1)}
              disabled={resultats.length === 0}
              aria-label="Résultat suivant"
              title="Plus récent (Maj + Entrée)"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={fermerRecherche}
              aria-label="Fermer la recherche"
              title="Fermer (Échap)"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Zone des messages ===== */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className="defilement-fin flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-20 md:px-6"
          ref={zone}
          onScroll={surDefilement}
          style={{ WebkitMaskImage: MASQUE_BAS, maskImage: MASQUE_BAS }}
        >
          {peutPlus && (
            <Bouton className="mb-2 self-center text-xs" onClick={chargerPlus}>
              Charger les messages précédents
            </Bouton>
          )}
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">Aucun message. Écrivez le premier !</p>
          )}

          {jours.map((jour) => (
            <section key={jour.cle} className="flex flex-col">
              <div
                className="sticky z-10 my-2 self-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md"
                style={{
                  top: rechercheOuverte ? DECALAGE_SEPARATEUR + HAUTEUR_BARRE_RECHERCHE : DECALAGE_SEPARATEUR,
                }}
              >
                {jour.label}
              </div>

              <AnimatePresence initial={!chargementInitial.current}>
                {jour.items.map(({ m, premier, debutJour }) => {
                  const estCourant = m.reference_message === courant
                  const correspond = ensembleResultats.has(m.reference_message)
                  const moi = m.expediteur?.matricule === utilisateur.matricule
                  const etiquette = m.categorie && m.categorie !== 'NORMAL'
                  return (
                    <div
                      key={m.reference_message}
                      id={`msg-${m.reference_message}`}
                      className={`-mx-2 rounded-xl px-2 transition-colors duration-300 ${
                        debutJour ? 'mt-1' : premier ? 'mt-3' : 'mt-0.5'
                      } ${estCourant ? 'bg-white/50' : correspond ? 'bg-white/20' : ''}`}
                    >
                     {/* ✅ Conteneur qui empile l'étiquette et la bulle */}
<div className={`flex flex-col ${moi ? 'items-end' : 'items-start'}`}>
  
  {/* L'étiquette est au-dessus, alignée du même côté que la bulle */}
  {etiquette && (
    <div className="mb-1 mr-1">
      <EtiquetteCategorie message={m} moi={moi} />
    </div>
  )}

  {/* La bulle est en dessous */}
  <BulleAnimee>
    <Bulle
      m={m}
      moi={moi}
      conversation={conversation}
      premierDuGroupe={premier}
      onRepondre={(msg) => { setEdition(null); setReponseA(msg); requestAnimationFrame(() => textareaRef.current?.focus()) }}
      onModifier={modifier}
      onSupprimer={supprimer}
      onReagir={reagir}
      onOuvrirEmoji={ouvrirPickerEmoji}
    />

    <BandeauEngagement
      message={m}
      moi={moi}
      enCours={accuseEnCours === m.reference_message}
      onAccuser={(statut) => accuser(m, statut)}
      onSuivre={() => setSuiviPour(m)}
      onVersions={() => setVersionsPour(m)}
    />
  </BulleAnimee>
</div>
                    </div>
                  )
                })}
              </AnimatePresence>
            </section>
          ))}

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                key="ecriture"
                role="status"
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="mt-3 inline-flex items-center gap-2 self-start rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-black/5"
              >
                <PointsEcriture />
                {conversation.type !== 'DIRECT' && (
                  <span className="text-xs text-slate-500" aria-hidden="true">
                    {typingUsers.map((u) => u.nom_complet).join(', ')}
                  </span>
                )}
                <span className="sr-only">
                  {typingUsers.map((u) => u.nom_complet).join(', ')}
                  {typingUsers.length > 1 ? ' sont en train d’écrire…' : ' est en train d’écrire…'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {boutonBas && (
            <motion.button
              key="bas"
              type="button"
              onClick={descendre}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="absolute bottom-4 right-5 z-20 flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon-600 md:right-8"
              aria-label={nouveaux > 0 ? `Descendre : ${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''} message${nouveaux > 1 ? 's' : ''}` : 'Descendre en bas'}
            >
              <ChevronDown className="size-5" />
              {nouveaux > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full bg-lagon-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                  {nouveaux > 99 ? '99+' : nouveaux}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {pickerPour && createPortal(
        <div className="fixed inset-0 z-[100]" onClick={() => setPickerPour(null)}>
          <div
            className="absolute"
            style={{ top: pickerCoords.top, left: pickerCoords.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              onSelection={(emoji) => reagir(pickerPour, emoji)}
              onFermer={() => setPickerPour(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {suiviPour && (
        <PanneauSuivi
          message={suiviPour}
          onFermer={() => setSuiviPour(null)}
          onActualise={majSuivi}
        />
      )}
      {versionsPour && (
        <PanneauVersions message={versionsPour} onFermer={() => setVersionsPour(null)} />
      )}

      {peutEcrire ? (
        <footer className="shrink-0 px-4 pb-4 pt-2 md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {erreur && <p className="mb-2 px-2 text-sm text-red-600" role="alert">{erreur}</p>}

            <div
              onDragOver={(e) => { if (!edition) { e.preventDefault(); setSurvol(true) } }}
              onDragLeave={() => setSurvol(false)}
              onDrop={surDepot}
              className={`rounded-3xl border bg-white/90 shadow-lg shadow-lagon-950/5 backdrop-blur-xl transition focus-within:border-lagon-400 focus-within:ring-4 focus-within:ring-lagon-500/15 ${
                survol ? 'border-lagon-400 ring-4 ring-lagon-500/15' : 'border-slate-200'
              }`}
            >
              {(reponseA || edition) && (
                <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {edition ? <Pencil className="size-4 shrink-0 text-slate-500" /> : <Reply className="size-4 shrink-0 text-slate-500" />}
                  <span className="min-w-0 flex-1 truncate">
                    {edition
                      ? 'Modification du message'
                      : `Réponse à ${reponseA.expediteur?.prenom ?? ''} : ${(reponseA.contenu ?? 'pièce jointe').slice(0, 60)}`}
                  </span>
                  <button type="button" onClick={annulerContexte} aria-label="Annuler" className="rounded-md p-0.5 text-slate-500 hover:bg-slate-200">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {!edition && avecAccuse(categorie) && (
                <div
                  className={`mx-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2 text-xs ${
                    categorie === 'URGENT' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  <span className="min-w-0 flex-1">Les destinataires devront accuser réception de ce message.</span>
                  <label className="flex items-center gap-2">
                    <span className="font-medium">Échéance</span>
                    <input
                      type="datetime-local"
                      value={echeance}
                      min={minEcheanceLocale()}
                      onChange={(e) => setEcheance(e.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-lagon-400 focus:outline-none focus:ring-2 focus:ring-lagon-500/20"
                    />
                  </label>
                  {echeance && (
                    <button
                      type="button"
                      onClick={() => setEcheance('')}
                      className="font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-lagon-600"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              )}

              {fichiers.length > 0 && (
                <ul className="flex flex-wrap gap-2 px-4 pt-3">
                  {fichiers.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                        aria-label={`Retirer ${f.name}`}
                      >
                        <Paperclip className="size-3.5" />
                        <span className="max-w-[180px] truncate">{f.name}</span>
                        <span className="text-slate-500">({tailleLisible(f.size)})</span>
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <textarea
                ref={textareaRef}
                value={texte}
                onChange={(e) => {
                  setTexte(e.target.value)
                  signalerFrappe()
                }}
                onKeyDown={surTouche}
                onPaste={surColler}
                placeholder={edition ? 'Modifiez votre message…' : 'Écrivez un message… '}
                aria-label="Message"
                rows={1}
                maxLength={MAX_CARACTERES}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="sentences"
                className="defilement-fin block max-h-[200px] min-h-[52px] w-full resize-none overflow-y-auto bg-transparent px-5 pb-1 pt-4 text-[15px] leading-6 text-slate-900 caret-lagon-600 placeholder-slate-500 focus:outline-none"
              />

              <div className="flex items-center gap-1 px-3 pb-3 pt-1">
                {!edition && (
                  <label
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    title="Joindre un fichier"
                  >
                    <Paperclip className="size-[18px]" />
                    <span className="sr-only">Joindre un fichier</span>
                    <input type="file" multiple accept={TYPES_ACCEPTES} onChange={surChoixFichiers} hidden />
                  </label>
                )}

                <button
                  ref={boutonEmojiRef}
                  type="button"
                  onClick={basculerPickerSaisie}
                  aria-expanded={pickerSaisieOuvert}
                  title="Emojis"
                  aria-label="Ouvrir le sélecteur d'emojis"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${
                    pickerSaisieOuvert ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Smile className="size-[18px]" />
                </button>

                {!edition && <SelecteurCategorie categorie={categorie} onChange={changerCategorie} />}

                <span className="flex-1" />

                {texte.length > MAX_CARACTERES * 0.9 && (
                  <span className="text-xs font-medium text-amber-700" aria-live="polite">
                    {texte.length} / {MAX_CARACTERES}
                  </span>
                )}

                <motion.button
                  type="button"
                  onClick={envoyer}
                  disabled={!peutEnvoyer}
                  animate={{ scale: peutEnvoyer ? 1 : 0.9 }}
                  whileTap={peutEnvoyer ? { scale: 0.88 } : undefined}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  title={edition ? 'Enregistrer' : 'Envoyer'}
                  aria-label={edition ? 'Enregistrer' : 'Envoyer'}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lagon-600 text-white shadow-sm transition-colors hover:bg-lagon-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagon-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  {envoi ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" role="status" aria-label="Envoi en cours" />
                  ) : (
                    <SendHorizontal className="size-[18px]" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {pickerSaisieOuvert && createPortal(
            <div className="fixed inset-0 z-[100]" onClick={() => setPickerSaisieOuvert(false)}>
              <div
                className="absolute"
                style={{ bottom: pickerSaisieCoords.bottom, left: pickerSaisieCoords.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <EmojiPicker
                  onSelection={insererEmoji}
                  onFermer={() => setPickerSaisieOuvert(false)}
                />
              </div>
            </div>,
            document.body
          )}
        </footer>
      ) : (
        <footer className="shrink-0 border-t border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
          {erreur && <p className="mb-2 text-red-600" role="alert">{erreur}</p>}
          Diffusion : seul le créateur peut écrire dans cette conversation.
        </footer>
      )}
    </div>
  )
}
