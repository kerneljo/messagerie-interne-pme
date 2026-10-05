import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Paperclip, Save, SendHorizontal, Shield, X } from 'lucide-react'
import api from '../api'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur, tailleLisible } from '../utils'
import { Avatar } from '../components/ui'
import SelecteurDestinataires from '../components/SelecteurDestinataires'
import EditeurRiche from '../components/EditeurRiche'

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024
const CLE_BROUILLON = 'brouillonMessage'

const MODELES = [
  'Bonjour', 'Merci', 'Réunion', "C'est fait", "Besoin d'aide", 'Bien reçu',
]

function lireBrouillon() {
  try {
    const brut = localStorage.getItem(CLE_BROUILLON)
    const b = brut ? JSON.parse(brut) : null
    return {
      titre: typeof b?.titre === 'string' ? b.titre : '',
      texte: typeof b?.texte === 'string' ? b.texte : '',
    }
  } catch {
    return { titre: '', texte: '' }
  }
}

export default function Envoyer() {
  const navigate = useNavigate()
  const { recharger } = useMessagerie()

  const [brouillon] = useState(lireBrouillon)

  const [choisis, setChoisis] = useState([])
  const [titre, setTitre] = useState(brouillon.titre)
  const [texte, setTexte] = useState(brouillon.texte)
  const [fichiers, setFichiers] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [brouillonEnregistre, setBrouillonEnregistre] = useState(
    Boolean(brouillon.titre || brouillon.texte)
  )

  // Enregistrement automatique du brouillon (titre + texte)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (titre || texte) {
          localStorage.setItem(CLE_BROUILLON, JSON.stringify({ titre, texte }))
          setBrouillonEnregistre(true)
        } else {
          localStorage.removeItem(CLE_BROUILLON)
          setBrouillonEnregistre(false)
        }
      } catch {
        // stockage indisponible : on ignore
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [titre, texte])

  const pret = choisis.length >= 1 && (texte.trim() !== '' || fichiers.length > 0)

  // Explique pourquoi l'envoi est bloqué
  const raison =
    choisis.length === 0
      ? 'Ajoutez au moins un destinataire'
      : texte.trim() === '' && fichiers.length === 0
        ? 'Écrivez un message ou joignez un fichier'
        : ''

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
    if (!pret || envoi) return
    setEnvoi(true)
    setErreur('')

    try {
      const { data } = await api.post('/api/conversations', {
        participants: choisis.map((p) => p.matricule),
        message: texte.trim() || '(pièce jointe)',
      })

      if (fichiers.length > 0) {
        const conversations = data.type === 'DIRECT' ? [data.conversation] : data.conversations
        for (const conv of conversations) {
          const form = new FormData()
          fichiers.forEach((f) => form.append('fichiers[]', f))
          await api.post(`/api/conversations/${conv.reference_conversation}/messages`, form)
        }
      }

      try { localStorage.removeItem(CLE_BROUILLON) } catch { /* ignoré */ }
      await recharger()

      if (data.type === 'DIRECT') {
        navigate(`/conversations/${data.conversation.reference_conversation}`)
      } else {
        navigate('/conversations')
      }
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={envoyer} className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* === Colonne principale === */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Zone défilante */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Destinataires */}
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <span className="pt-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    À
                  </span>
                  <div className="flex-1">
                    <SelecteurDestinataires
                      direct={false}
                      choisis={choisis}
                      onChange={setChoisis}
                    />
                  </div>
                </div>
              </div>

              {/* Titre */}
              <div className="border-b border-slate-100 px-4 py-3">
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  // Entrée ne doit pas envoyer le formulaire depuis ce champ
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
                  placeholder="Titre du message (optionnel)"
                  aria-label="Titre du message (optionnel)"
                  maxLength={150}
                  className="w-full border-0 bg-transparent text-lg font-semibold text-slate-900 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {/* Éditeur */}
              <div className="p-4">
                <EditeurRiche
                  value={texte}
                  onChange={setTexte}
                  placeholder="Bonjour à tous,&#10;&#10;La maintenance du serveur aura lieu vendredi…"
                />
              </div>

              {/* Fichiers joints */}
              {fichiers.length > 0 && (
                <div className="border-t border-slate-100 p-4">
                  <ul className="space-y-2">
                    {fichiers.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <FileText className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{f.name}</p>
                          <p className="text-xs text-slate-600">{tailleLisible(f.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                          className="rounded-md p-1 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                          aria-label={`Retirer ${f.name}`}
                          title="Retirer"
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pied de carte : joindre + compteur */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus-within:outline-2 focus-within:outline-blue-600">
                    <Paperclip className="size-3.5" />
                    Joindre
                    <input type="file" multiple accept={TYPES_ACCEPTES} onChange={ajouterFichiers} className="sr-only" />
                  </label>
                  <span className="text-xs tabular-nums text-slate-600">
                    {fichiers.length}/{MAX_FICHIERS}
                  </span>
                </div>
                <span
                  className={`text-xs tabular-nums transition-colors ${
                    texte.length > 4500 ? 'font-medium text-amber-700' : 'text-slate-600'
                  }`}
                >
                  {texte.length} / 5000
                </span>
              </div>
            </div>
          </div>

          {/* Barre d'actions fixe en bas */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
            {erreur && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800" role="alert">
                {erreur}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-600" aria-live="polite">
                {raison ||
                  `${choisis.length} destinataire${choisis.length > 1 ? 's' : ''}${
                    fichiers.length > 0
                      ? ` · ${fichiers.length} pièce${fichiers.length > 1 ? 's' : ''} jointe${fichiers.length > 1 ? 's' : ''}`
                      : ''
                  }`}
              </p>

              <div className="flex items-center gap-3">
                {brouillonEnregistre && (
                  <span className="hidden items-center gap-1.5 text-xs text-slate-600 sm:inline-flex">
                    <Save className="size-3.5" aria-hidden="true" />
                    Brouillon enregistré
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!pret || envoi}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  <SendHorizontal className="size-4" />
                  {envoi ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === Colonne latérale === */}
        <aside className="hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-slate-200 bg-white p-6 lg:block">
          {/* Destinataires choisis */}
          {choisis.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Destinataires</h3>
                <span className="text-xs font-semibold text-blue-700">{choisis.length}</span>
              </div>
              <ul className="space-y-2">
                {choisis.map((p) => (
                  <li key={p.matricule} className="flex items-center gap-2.5">
                    <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {p.prenom} {p.nom}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {p.poste || p.service || p.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modèles rapides */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Modèles rapides</h3>
            <div className="flex flex-wrap gap-1.5">
              {MODELES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTexte(texte ? `${texte}\n${m}` : m)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Note de confidentialité */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Shield className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-blue-900">Échanges privés</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-900">
                  Seuls les participants voient ce message et ses pièces jointes.
                  L'historique des envois est conservé.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  )
}
