import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, SendHorizontal, CalendarClock, Paperclip, FileText,
  Shield, ChevronDown, Save,
} from 'lucide-react'
import api from '../api'
import { useMessagerie } from '../MessagerieContext'
import { messageErreur, tailleLisible } from '../utils'
import { Avatar } from '../components/ui'
import SelecteurDestinataires from '../components/SelecteurDestinataires'
import EditeurRiche from '../components/EditeurRiche'

const TYPES_ACCEPTES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp'
const MAX_FICHIERS = 5
const MAX_OCTETS = 10 * 1024 * 1024

const MODELES = [
  'Bonjour', 'Merci', 'Réunion', "C'est fait", "Besoin d'aide", 'Bien reçu',
]

export default function Envoyer() {
  const navigate = useNavigate()
  const { recharger } = useMessagerie()

  const [choisis, setChoisis] = useState([])
  const [titre, setTitre] = useState('')
  const [texte, setTexte] = useState('')
  const [fichiers, setFichiers] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [menuProgrammer, setMenuProgrammer] = useState(false)

  // Auto-save brouillon
  useEffect(() => {
    const t = setTimeout(() => {
      if (choisis.length > 0 || texte || titre) {
        localStorage.setItem('brouillonMessage', JSON.stringify({ titre, texte }))
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [titre, texte, choisis])

  const pret = choisis.length >= 1 && (texte.trim() !== '' || fichiers.length > 0)

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

      localStorage.removeItem('brouillonMessage')
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
    <form onSubmit={envoyer} className="flex h-full flex-col bg-slate-50">
      {/* ============ Barre compacte ============ */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Save className="size-3" />
          Brouillon enregistré automatiquement
        </p>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth="2"/><path d="m21 21-4.35-4.35" strokeWidth="2"/></svg>
          </span>
          <input
            type="search"
            placeholder="Rechercher"
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-400"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-200">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ============ Corps : 2 colonnes ============ */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* === Colonne principale === */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Ligne destinataires + mode */}
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <span className="pt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                placeholder="Titre du message (optionnel)"
                maxLength={150}
                className="w-full border-0 bg-transparent text-lg font-semibold text-slate-900 placeholder-slate-300
                           focus:outline-none"
              />
            </div>

            {/* Éditeur riche */}
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
                      className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                        <p className="text-xs text-slate-500">{tailleLisible(f.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFichiers(fichiers.filter((_, j) => j !== i))}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                        aria-label="Retirer"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pied : joindre + compteur alignés sur la même base */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition">
                  <Paperclip className="size-3.5" />
                  Joindre
                  <input type="file" multiple accept={TYPES_ACCEPTES} onChange={ajouterFichiers} hidden />
                </label>
                <span className="text-xs text-slate-400 tabular-nums">
                  {fichiers.length}/{MAX_FICHIERS}
                </span>
              </div>
              <span
                className={`text-xs tabular-nums transition-colors ${
                  texte.length > 4500 ? 'text-amber-600 font-medium' : 'text-slate-400'
                }`}
              >
                {texte.length} / 5000
              </span>
            </div>
          </div>

          {/* Barre d'actions bas */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuProgrammer(!menuProgrammer)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <CalendarClock className="size-4" />
                Programmer
              </button>
              <span className="text-xs leading-none text-slate-500 self-center">
                {choisis.length} destinataire{choisis.length > 1 ? 's' : ''}
                {fichiers.length > 0 && ` · ${fichiers.length} pièce${fichiers.length > 1 ? 's' : ''} jointe${fichiers.length > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                <span className="size-1.5 rounded-full bg-slate-400"></span>
                Brouillon
              </span>
              <button
                type="submit"
                disabled={!pret || envoi}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white
                           hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20
                           disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <SendHorizontal className="size-4" />
                {envoi ? 'Envoi…' : 'Envoyer'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 transition"
                aria-label="Plus d'options"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>

          {erreur && (
            <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {erreur}
            </p>
          )}
        </div>

        {/* === Colonne latérale === */}
        <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white p-6 overflow-y-auto lg:block space-y-4">

          {/* Carte Destinataires */}
          {choisis.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Destinataires</h3>
                <span className="text-xs font-semibold text-indigo-600">{choisis.length}</span>
              </div>
              <ul className="space-y-2">
                {choisis.map((p) => (
                  <li key={p.matricule} className="flex items-center gap-2.5">
                    <Avatar prenom={p.prenom} nom={p.nom} taille="sm" photoUrl={p.photo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {p.prenom} {p.nom}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {p.poste || p.service || p.email}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-500"></span>
                      En ligne
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modèles rapides */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Modèles rapides</h3>
            <div className="flex flex-wrap gap-1.5">
              {MODELES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTexte(texte ? `${texte}\n${m}` : m)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Note sécurité */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Shield className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-indigo-900">Échanges privés</p>
                <p className="mt-1 text-xs text-indigo-800/80 leading-relaxed">
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
