import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone, Paperclip, SendHorizontal, User, Users, X } from 'lucide-react'
import api from '../api'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur, tailleLisible } from '../utils'
import { Bouton, Carte } from '../components/ui'
import SelecteurDestinataires from '../components/SelecteurDestinataires'

const TYPES = [
  { valeur: 'DIRECT', nom: 'Message direct', aide: 'Une seule personne', icone: User },
  { valeur: 'GROUPE', nom: 'Groupe', aide: 'Plusieurs personnes, tout le monde peut répondre', icone: Users },
  { valeur: 'DIFFUSION', nom: 'Diffusion', aide: 'Plusieurs destinataires qui lisent sans répondre', icone: Megaphone },
]

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024

export default function Envoyer() {
  const navigate = useNavigate()
  const { recharger } = useMessagerie()

  const [type, setType] = useState('DIRECT')
  const [titre, setTitre] = useState('')
  const [choisis, setChoisis] = useState([])
  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const conversationCreee = useRef(null) // évite de recréer la conversation si l'envoi du message échoue

  const direct = type === 'DIRECT'
  const minimum = type === 'GROUPE' ? 2 : 1 // sans compter l'expéditeur
  const pret = choisis.length >= minimum && (direct || titre.trim() !== '') && (texte.trim() !== '' || fichiers.length > 0)

  function changerType(nouveau) {
    conversationCreee.current = null
    setType(nouveau)
    if (nouveau === 'DIRECT') setChoisis((c) => c.slice(0, 1))
  }

  function changerDestinataires(liste) {
    conversationCreee.current = null
    setChoisis(liste)
  }

  function ajouterFichiers(e) {
    const nouveaux = Array.from(e.target.files)
    e.target.value = ''
    const total = [...fichiers, ...nouveaux]
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

  async function envoyer(e) {
    e.preventDefault()
    if (!pret) return
    setEnvoi(true)
    setErreur('')
    try {
      if (!conversationCreee.current) {
        const { data } = await api.post('/api/conversations', {
          type,
          titre: direct ? undefined : titre.trim(),
          participants: choisis.map((p) => p.matricule),
        })
        conversationCreee.current = data.reference_conversation
      }

      const donnees = new FormData()
      if (texte.trim()) donnees.append('contenu', texte.trim())
      fichiers.forEach((f) => donnees.append('fichiers[]', f))
      await api.post(`/api/conversations/${conversationCreee.current}/messages`, donnees)

      await recharger()
      navigate(`/conversations/${conversationCreee.current}`)
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={envoyer} className="mx-auto grid max-w-6xl gap-6 p-4 md:p-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Carte className="space-y-4 p-5">
          <h2 className="font-semibold text-slate-800">1. Type d'envoi</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => (
              <label
                key={t.valeur}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${
                  type === t.valeur ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.valeur}
                  checked={type === t.valeur}
                  onChange={() => changerType(t.valeur)}
                  className="sr-only"
                />
                <t.icone className={`size-5 ${type === t.valeur ? 'text-blue-600' : 'text-slate-500'}`} />
                <span className="text-sm font-semibold text-slate-800">{t.nom}</span>
                <span className="text-xs text-slate-500">{t.aide}</span>
              </label>
            ))}
          </div>

          {!direct && (
            <label className="block text-sm font-medium text-slate-700">
              Titre
              <input
                value={titre}
                onChange={(e) => { conversationCreee.current = null; setTitre(e.target.value) }}
                maxLength={150}
                placeholder={type === 'GROUPE' ? 'Nom du groupe' : "Objet de l'annonce"}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
              />
            </label>
          )}
        </Carte>

        <Carte className="space-y-4 p-5">
          <h2 className="font-semibold text-slate-800">2. {direct ? 'Destinataire' : 'Destinataires'}</h2>
          <SelecteurDestinataires direct={direct} choisis={choisis} onChange={changerDestinataires} />
        </Carte>

        <Carte className="space-y-4 p-5">
          <h2 className="font-semibold text-slate-800">3. Message</h2>
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Écrivez votre message..."
            aria-label="Message"
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
          />

          {fichiers.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {fichiers.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                    className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs hover:bg-slate-100"
                  >
                    <Paperclip className="size-3.5" />
                    {f.name} ({tailleLisible(f.size)})
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Paperclip className="size-4" />
            Joindre des fichiers
            <input type="file" multiple accept={TYPES_ACCEPTES} onChange={ajouterFichiers} hidden />
          </label>
          <p className="text-xs text-slate-500">5 fichiers maximum, 10 Mo chacun (PDF, Office, images, texte).</p>
        </Carte>

        {erreur && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{erreur}</p>}

        <div className="flex justify-end gap-3">
          <Bouton onClick={() => navigate(-1)} disabled={envoi}>Annuler</Bouton>
          <Bouton type="submit" variante="primaire" disabled={!pret || envoi}>
            <SendHorizontal className="size-4" />
            {envoi ? 'Envoi...' : 'Envoyer le message'}
          </Bouton>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Carte className="space-y-3 p-5 text-sm text-slate-600">
          <h2 className="font-semibold text-slate-800">Quel type choisir ?</h2>
          <p><strong className="text-slate-800">Message direct</strong> : une discussion privée avec un collègue. Si elle existe déjà, elle est réutilisée.</p>
          <p><strong className="text-slate-800">Groupe</strong> : au moins 3 personnes (vous compris), chacun peut écrire.</p>
          <p><strong className="text-slate-800">Diffusion</strong> : vous écrivez, les destinataires lisent. Idéal pour une annonce à un service.</p>
          <p className="rounded-lg bg-slate-50 p-3 text-xs">
            Astuce : tapez le nom d'un service dans la recherche puis « Tout sélectionner » pour écrire à tout le service.
          </p>
        </Carte>
      </aside>
    </form>
  )
}
