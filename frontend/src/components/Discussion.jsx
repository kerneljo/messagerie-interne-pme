import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, Paperclip, Pencil, Reply, SendHorizontal, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../AuthContext'
import usePolling from '../usePolling'
import { heureSeule, libelleJour, messageErreur, tailleLisible } from '../utils'
import { Avatar, Bouton } from './ui'

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024

/** Fusionne la fenêtre des derniers messages reçue du serveur avec les messages plus anciens déjà chargés. */
function fusionner(anciens, nouveaux) {
  if (nouveaux.length === 0) return []
  const min = nouveaux[0].reference_message
  return [...anciens.filter((m) => m.reference_message < min), ...nouveaux]
}

function Bulle({ m, moi, conversation, onRepondre, onModifier, onSupprimer }) {
  const autres = conversation.participants.length - 1
  const statut =
    m.nb_lecteurs === 0 ? 'Envoyé' : conversation.type === 'DIRECT' ? 'Lu' : `Lu par ${m.nb_lecteurs}/${autres}`

  return (
    <div className={`group flex ${moi ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm md:max-w-[65%] ${
          moi ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
        }`}
      >
        {!moi && conversation.type !== 'DIRECT' && (
          <p className="mb-0.5 text-xs font-semibold text-blue-600">{m.expediteur?.prenom} {m.expediteur?.nom}</p>
        )}

        {m.reponse_a && (
          <div className={`mb-1.5 rounded-md border-l-4 px-2 py-1 text-xs ${moi ? 'border-blue-200 bg-blue-700/50' : 'border-blue-500 bg-slate-100'}`}>
            <p className="font-semibold">{m.reponse_a.expediteur}</p>
            <p className={`truncate ${moi ? 'text-blue-100' : 'text-slate-500'}`}>{m.reponse_a.apercu}</p>
          </div>
        )}

        {m.contenu && <p className="whitespace-pre-wrap break-words text-sm">{m.contenu}</p>}

        {m.fichiers.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {m.fichiers.map((f) => (
              <li key={f.reference_fichier}>
                <a
                  href={`/api/fichiers/${f.reference_fichier}`}
                  download
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    moi ? 'bg-blue-700/50 hover:bg-blue-700' : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <Paperclip className="size-4 shrink-0" />
                  <span className="truncate">{f.nom_original}</span>
                  <span className={`shrink-0 text-xs ${moi ? 'text-blue-100' : 'text-slate-400'}`}>({tailleLisible(f.taille)})</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${moi ? 'text-blue-100' : 'text-slate-400'}`}>
          <span>{heureSeule(m.date_envoi)}{m.date_modification && ' · modifié'}</span>
          {moi && (
            <span className="flex items-center gap-0.5">
              {m.nb_lecteurs > 0 ? <CheckCheck className="size-3.5" /> : <Check className="size-3.5" />}
              {statut}
            </span>
          )}
        </div>

        <div className={`mt-1 flex justify-end gap-3 text-xs md:opacity-0 md:transition-opacity md:group-hover:opacity-100 ${moi ? 'text-blue-100' : 'text-slate-500'}`}>
          <button onClick={() => onRepondre(m)} className="flex items-center gap-1 hover:underline"><Reply className="size-3.5" />Répondre</button>
          {moi && <button onClick={() => onModifier(m)} className="flex items-center gap-1 hover:underline"><Pencil className="size-3.5" />Modifier</button>}
          {moi && <button onClick={() => onSupprimer(m)} className="flex items-center gap-1 hover:underline"><Trash2 className="size-3.5" />Supprimer</button>}
        </div>
      </div>
    </div>
  )
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

  const zone = useRef(null)
  const coller = useRef(true) // garder le défilement en bas ?
  const premiere = useRef(true)

  const peutEcrire = conversation.type !== 'DIFFUSION' || conversation.matricule_createur === utilisateur.matricule

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/conversations/${ref}/messages`)
      setMessages((actuels) => fusionner(actuels, data.messages))
      if (premiere.current) {
        setPeutPlus(data.peut_charger_plus)
        premiere.current = false
      }

      // Marque comme lus les messages reçus, seulement si l'onglet est visible
      const nonLus = data.messages.some((m) => !m.lu_par_moi && m.expediteur?.matricule !== utilisateur.matricule)
      if (nonLus && !document.hidden) {
        await api.post(`/api/conversations/${ref}/lu`)
        onLu?.()
      }
    } catch {
      // erreur réseau ponctuelle : le prochain cycle réessaie
    }
  }, [ref, utilisateur.matricule, onLu])

  usePolling(charger, 3000)

  // Défilement automatique vers le bas quand on y est déjà
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
      setMessages((actuels) => [...data.messages, ...actuels])
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
    if (!window.confirm('Supprimer ce message ?')) return
    try {
      await api.delete(`/api/messages/${m.reference_message}`)
      await charger()
    } catch (e) {
      setErreur(messageErreur(e))
    }
  }

  function modifier(m) {
    setEdition(m)
    setReponseA(null)
    setFichiers([])
    setTexte(m.contenu ?? '')
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
    <div className="flex h-full min-h-0 flex-col">
     		<header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
  <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden" onClick={onRetour} aria-label="Retour à la liste">
    <ArrowLeft className="size-5" />
  </button>

  {conversation.type === 'DIRECT' && autre?.matricule ? (
    <Link
      to={`/utilisateurs/${autre.matricule}`}
      className="flex items-center gap-3 min-w-0 flex-1 rounded-lg -mx-2 px-2 py-1 hover:bg-slate-50 transition"
    >
      <Avatar
        prenom={autre.prenom}
        nom={autre.nom}
        photoUrl={autre.photo_url}
      />
      <div className="min-w-0">
        <h2 className="truncate font-semibold text-slate-800">{conversation.titre}</h2>
        {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
      </div>
    </Link>
  ) : (
    <>
      <Avatar
        prenom={conversation.titre}
        nom=""
      />
      <div className="min-w-0">
        <h2 className="truncate font-semibold text-slate-800">{conversation.titre}</h2>
        {sousTitre && <p className="truncate text-xs text-slate-500">{sousTitre}</p>}
      </div>
    </>
  )}
</header>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-slate-50 p-4" ref={zone} onScroll={surDefilement}>
        {peutPlus && (
          <Bouton className="self-center text-xs" onClick={chargerPlus}>Charger les messages précédents</Bouton>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Aucun message. Écrivez le premier !</p>}

        {messages.map((m) => {
          const jour = new Date(m.date_envoi).toDateString()
          const nouveauJour = jour !== jourPrecedent
          jourPrecedent = jour
          return (
            <Fragment key={m.reference_message}>
              {nouveauJour && (
                <div className="my-2 self-center rounded-full bg-slate-200 px-3 py-0.5 text-xs text-slate-600">
                  {libelleJour(m.date_envoi)}
                </div>
              )}
              <Bulle
                m={m}
                moi={m.expediteur?.matricule === utilisateur.matricule}
                conversation={conversation}
                onRepondre={(msg) => { setEdition(null); setReponseA(msg) }}
                onModifier={modifier}
                onSupprimer={supprimer}
              />
            </Fragment>
          )
        })}
      </div>

      {peutEcrire ? (
        <footer className="space-y-2 border-t border-slate-200 bg-white p-3">
          {(reponseA || edition) && (
            <div className="flex items-center justify-between gap-2 rounded-lg border-l-4 border-blue-500 bg-slate-100 px-3 py-1.5 text-sm text-slate-600">
              <span className="truncate">
                {edition
                  ? 'Modification du message'
                  : `Réponse à ${reponseA.expediteur?.prenom ?? ''} : ${(reponseA.contenu ?? 'pièce jointe').slice(0, 60)}`}
              </span>
              <button onClick={annulerContexte} aria-label="Annuler"><X className="size-4" /></button>
            </div>
          )}

          {fichiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
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

          {erreur && <p className="text-sm text-red-600" role="alert">{erreur}</p>}

          <div className="flex items-end gap-2">
            {!edition && (
              <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50" title="Joindre un fichier">
                <Paperclip className="size-5" />
                <span className="sr-only">Joindre un fichier</span>
                <input type="file" multiple accept={TYPES_ACCEPTES} onChange={ajouterFichiers} hidden />
              </label>
            )}
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={surTouche}
              placeholder="Écrivez un message... (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
              rows={2}
              maxLength={5000}
              className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            <Bouton variante="primaire" className="h-10" onClick={envoyer} disabled={envoi}>
              <SendHorizontal className="size-4" />
              {edition ? 'Enregistrer' : 'Envoyer'}
            </Bouton>
          </div>
        </footer>
      ) : (
        <footer className="border-t border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          Diffusion : seul le créateur peut écrire dans cette conversation.
        </footer>
      )}
    </div>
  )
}
