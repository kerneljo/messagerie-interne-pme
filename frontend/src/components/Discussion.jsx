import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Paperclip, SendHorizontal, X, Smile } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'
import usePolling from '../usePolling'
import useConversationTempsReel from '../conversationTempsReel'
import useSignalerFrappe from '../signalerFrappe'
import { libelleJour, messageErreur, tailleLisible } from '../utils'
import { Avatar, Bouton } from './ui'
import EmojiPicker, { HAUTEUR_PICKER, LARGEUR_PICKER } from './EmojiPicker'
import Bulle, { BulleAnimee } from './Bulle'
import ModalApercu from './ModalApercu'

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024
const MAX_REACTIONS_PAR_USER = 3

function fusionner(anciens, nouveaux) {
  if (nouveaux.length === 0) return []
  const min = nouveaux[0].reference_message
  return [...anciens.filter((m) => m.reference_message < min), ...nouveaux]
}

export default function Discussion({ conversation, onLu, onRetour }) {
  const { utilisateur } = useAuth()
  const ref = conversation.reference_conversation

  const [messages, setMessages] = useState([])
  const [peutPlus, setPeutPlus] = useState(false)
  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [reponseA, setReponseA] = useState(null)
  const [edition, setEdition] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [pickerSaisieOuvert, setPickerSaisieOuvert] = useState(false)

  const [pickerPour, setPickerPour] = useState(null)
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 })

  const zone = useRef(null)
  const coller = useRef(true)
  const premiere = useRef(true)

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

  // 📡 Écoute temps réel (remplace/complète le polling)
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

  // ✍️ Signal "en train d'écrire"
  const signalerFrappe = useSignalerFrappe(ref)

  // Filet de sécurité : polling ralenti (le temps réel fait le gros du travail)
  usePolling(charger, 30000)

  useEffect(() => {
    const el = zone.current
    if (el && coller.current) el.scrollTop = el.scrollHeight
  }, [messages])

  function surDefilement() {
    const el = zone.current
    coller.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
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

  function ajouterFichiers(e) {
    const choisis = Array.from(e.target.files)
    e.target.value = ''
    const total = [...fichiers, ...choisis]
    if (total.length > MAX_FICHIERS) {
      setErreur(`${MAX_FICHIERS} fichiers maximum par message.`)
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
        fichiers.forEach((f) => donnees.append('fichiers[]', f))
        await api.post(`/api/conversations/${ref}/messages`, donnees)
        setFichiers([])
        setReponseA(null)
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

  function annulerContexte() {
    setEdition(null)
    setReponseA(null)
    setTexte('')
  }

  function surTouche(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      envoyer()
    }
  }

  const autre = conversation.participants.find((p) => p.matricule !== utilisateur.matricule)
  const sousTitre =
    conversation.type === 'DIRECT'
      ? autre?.poste
      : `${conversation.participants.length} participants · ${conversation.participants.map((p) => p.prenom).join(', ')}`

  let jourPrecedent = ''

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* ===== Header ===== */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden" onClick={onRetour} aria-label="Retour">
          <ArrowLeft className="size-5" />
        </button>

        {conversation.type === 'DIRECT' && autre?.matricule ? (
          <Link to={`/utilisateurs/${autre.matricule}`} className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-slate-50">
            <Avatar prenom={autre.prenom} nom={autre.nom} photoUrl={autre.photo_url} />
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-900">{conversation.titre}</h2>
              {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
            </div>
          </Link>
        ) : (
          <>
            <Avatar prenom={conversation.titre} nom="" />
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-900">{conversation.titre}</h2>
              {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
            </div>
          </>
        )}
      </header>

      {/* ===== Zone des messages ===== */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-4 py-6 md:px-6"
        ref={zone}
        onScroll={surDefilement}
      >
        {peutPlus && (
          <Bouton className="self-center text-xs" onClick={chargerPlus}>
            Charger les messages précédents
          </Bouton>
        )}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">Aucun message. Écrivez le premier !</p>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const jour = new Date(m.date_envoi).toDateString()
            const nouveauJour = jour !== jourPrecedent
            jourPrecedent = jour
            return (
              <Fragment key={m.reference_message}>
                {nouveauJour && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="my-2 self-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {libelleJour(m.date_envoi)}
                  </motion.div>
                )}
                <BulleAnimee>
                  <Bulle
                    m={m}
                    moi={m.expediteur?.matricule === utilisateur.matricule}
                    conversation={conversation}
                    onRepondre={(msg) => { setEdition(null); setReponseA(msg) }}
                    onModifier={modifier}
                    onSupprimer={supprimer}
                    onReagir={reagir}
                    onOuvrirEmoji={ouvrirPickerEmoji}
                  />
                </BulleAnimee>
              </Fragment>
            )
          })}
        </AnimatePresence>

        {/* ✍️ Indicateur "en train d'écrire" */}
        {typingUsers.length > 0 && (
          <p className="self-start px-2 text-xs italic text-slate-500">
            {typingUsers.map((u) => u.nom_complet).join(', ')}
            {typingUsers.length > 1 ? ' sont en train d’écrire…' : ' est en train d’écrire…'}
          </p>
        )}
      </div>

      {/* ===== Picker global ===== */}
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

      {/* ===== Footer ===== */}
      {peutEcrire ? (
        <footer className="border-t border-slate-200 bg-white px-4 py-3">
          {(reponseA || edition) && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border-l-4 border-blue-500 bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              <span className="truncate">
                {edition
                  ? 'Modification du message'
                  : `Réponse à ${reponseA.expediteur?.prenom ?? ''} : ${(reponseA.contenu ?? 'pièce jointe').slice(0, 60)}`}
              </span>
              <button onClick={annulerContexte} aria-label="Annuler">
                <X className="size-4" />
              </button>
            </div>
          )}

          {fichiers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {fichiers.map((f, i) => (
                <button
                  key={`${f.name}-${i}`}
                  onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                  className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs hover:bg-slate-100"
                >
                  <Paperclip className="size-3.5" />
                  {f.name} ({tailleLisible(f.size)})
                  <X className="size-3.5" />
                </button>
              ))}
            </div>
          )}

          {erreur && <p className="mb-2 text-sm text-red-600" role="alert">{erreur}</p>}

          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              {!edition && (
                <label
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  title="Joindre un fichier"
                >
                  <Paperclip className="size-[18px]" />
                  <span className="sr-only">Joindre un fichier</span>
                  <input
                    type="file"
                    multiple
                    accept={TYPES_ACCEPTES}
                    onChange={ajouterFichiers}
                    hidden
                  />
                </label>
              )}

              <textarea
                value={texte}
                onChange={(e) => {
                  setTexte(e.target.value)
                  signalerFrappe()
                }}
                onKeyDown={surTouche}
                placeholder="Écrivez un message…"
                rows={1}
                maxLength={5000}
                className="max-h-32 min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
              />

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerSaisieOuvert(!pickerSaisieOuvert)}
                  className={`flex size-9 items-center justify-center rounded-full transition ${
                    pickerSaisieOuvert
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title="Emojis"
                  aria-label="Ouvrir le sélecteur d'emojis"
                >
                  <Smile className="size-[18px]" />
                </button>

                {pickerSaisieOuvert && createPortal(
                  <div className="fixed inset-0 z-[100]" onClick={() => setPickerSaisieOuvert(false)}>
                    <div
                      className="absolute"
                      style={{ bottom: '88px', right: '16px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmojiPicker
                        onSelection={(emoji) => setTexte((t) => t + emoji)}
                        onFermer={() => setPickerSaisieOuvert(false)}
                      />
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={envoyer}
              disabled={envoi || (!texte.trim() && fichiers.length === 0)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md
                         transition hover:bg-blue-700 active:scale-95
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                         disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-blue-600"
              title={edition ? 'Enregistrer' : 'Envoyer'}
              aria-label={edition ? 'Enregistrer' : 'Envoyer'}
            >
              <SendHorizontal className="size-[18px]" />
            </button>
          </div>
        </footer>
      ) : (
        <footer className="border-t border-slate-200 bg-white p-4 text-center text-sm text-slate-600">
          Diffusion : seul le créateur peut écrire dans cette conversation.
        </footer>
      )}
    </div>
  )
}
