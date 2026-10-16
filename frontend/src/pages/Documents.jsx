import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, File, FileImage, FileSpreadsheet, FileText,
  Loader2, MessageSquare, Presentation, Search,
} from 'lucide-react'
import api from '../api'
import useDebounce from '../useDebounce'
import { messageErreur, tailleLisible } from '../utils'

const LIMITE = 30

const CATEGORIES = [
  { id: '', libelle: 'Tous' },
  { id: 'pdf', libelle: 'PDF' },
  { id: 'texte', libelle: 'Textes' },
  { id: 'tableur', libelle: 'Tableurs' },
  { id: 'presentation', libelle: 'Présentations' },
  { id: 'image', libelle: 'Images' },
]

const STYLES = {
  pdf: { icone: FileText, classes: 'bg-red-50 text-red-700' },
  texte: { icone: FileText, classes: 'bg-indigo-50 text-indigo-700' },
  tableur: { icone: FileSpreadsheet, classes: 'bg-emerald-50 text-emerald-700' },
  presentation: { icone: Presentation, classes: 'bg-amber-50 text-amber-700' },
  image: { icone: FileImage, classes: 'bg-sky-50 text-sky-700' },
  autre: { icone: File, classes: 'bg-slate-100 text-slate-600' },
}

const EXTENSIONS = {
  pdf: 'pdf',
  doc: 'texte', docx: 'texte', odt: 'texte', txt: 'texte',
  xls: 'tableur', xlsx: 'tableur', ods: 'tableur', csv: 'tableur',
  ppt: 'presentation', pptx: 'presentation',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
}

function categorieDe(nom) {
  const ext = nom.includes('.') ? nom.split('.').pop().toLowerCase() : ''
  return EXTENSIONS[ext] ?? 'autre'
}

function formaterDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Documents() {
  const [documents, setDocuments] = useState([])
  const [peutPlus, setPeutPlus] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [chargementPlus, setChargementPlus] = useState(false)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [categorie, setCategorie] = useState('')
  const [telecharge, setTelecharge] = useState(null)

  const rechercheDebouncee = useDebounce(recherche, 300)
  const filtreActif = rechercheDebouncee.trim() !== '' || categorie !== ''

  function parametres(extra = {}) {
    return {
      q: rechercheDebouncee.trim() || undefined,
      categorie: categorie || undefined,
      limite: LIMITE,
      ...extra,
    }
  }

  // Premier chargement, et à chaque changement de recherche ou de type
  useEffect(() => {
    let annule = false
    setChargement(true)
    setErreur('')

    api.get('/api/documents', { params: parametres() })
      .then(({ data }) => {
        if (annule) return
        setDocuments(data.documents)
        setPeutPlus(data.peut_charger_plus)
      })
      .catch((e) => {
        if (annule) return
        setDocuments([])
        setPeutPlus(false)
        setErreur(messageErreur(e))
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })

    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercheDebouncee, categorie])

  async function chargerPlus() {
    const dernier = documents[documents.length - 1]
    if (!dernier) return
    setChargementPlus(true)
    try {
      const { data } = await api.get('/api/documents', {
        params: parametres({ avant: dernier.reference_fichier }),
      })
      setDocuments((actuels) => [...actuels, ...data.documents])
      setPeutPlus(data.peut_charger_plus)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setChargementPlus(false)
    }
  }

  async function telecharger(doc) {
    setTelecharge(doc.reference_fichier)
    setErreur('')
    try {
      const { data } = await api.get(`/api/fichiers/${doc.reference_fichier}`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = doc.nom_original
      document.body.appendChild(lien)
      lien.click()
      lien.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      setErreur('Le téléchargement a échoué.')
    } finally {
      setTelecharge(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6 md:px-8">
      <p className="mb-5 text-sm text-slate-600">
        Les pièces jointes des conversations auxquelles vous participez. Seuls vos propres échanges sont listés.
      </p>

      {/* Recherche et filtres */}
      <div className="mb-5 space-y-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un document par son nom…"
            aria-label="Rechercher un document"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de document">
          {CATEGORIES.map((c) => {
            const actif = categorie === c.id
            return (
              <button
                key={c.id || 'tous'}
                type="button"
                onClick={() => setCategorie(c.id)}
                aria-pressed={actif}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  actif
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {c.libelle}
              </button>
            )
          })}
        </div>
      </div>

      {erreur && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800" role="alert">
          {erreur}
        </p>
      )}

      {chargement ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Chargement des documents…
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <File className="mx-auto size-10 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {filtreActif ? 'Aucun document ne correspond à votre recherche' : 'Aucun document échangé pour le moment'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {filtreActif
              ? 'Modifiez le nom ou le type pour élargir la recherche.'
              : 'Les fichiers joints à vos conversations apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-600" aria-live="polite">
            {documents.length}{peutPlus ? '+' : ''} document{documents.length > 1 ? 's' : ''}
          </p>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {documents.map((d) => {
              const style = STYLES[categorieDe(d.nom_original)]
              const Icone = style.icone
              const auteur = d.envoye_par_moi
                ? 'Vous'
                : [d.expediteur?.prenom, d.expediteur?.nom].filter(Boolean).join(' ')

              return (
                <li key={d.reference_fichier} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${style.classes}`}>
                    <Icone className="size-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{d.nom_original}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {[auteur, formaterDate(d.date_envoi), tailleLisible(d.taille)].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <span
                    className="hidden max-w-[11rem] truncate text-xs text-slate-600 md:block"
                    title={`Conversation : ${d.conversation?.titre ?? ''}`}
                  >
                    {d.conversation?.titre}
                  </span>

                  {d.hash_sha256 && (
                    <span
                      className="hidden font-mono text-[11px] text-slate-500 xl:block"
                      title={`Empreinte SHA-256 enregistrée à l’envoi : ${d.hash_sha256}`}
                    >
                      {d.hash_sha256.slice(0, 8)}…
                    </span>
                  )}

                  {d.conversation?.reference_conversation && (
                    <Link
                      to={`/conversations/${d.conversation.reference_conversation}`}
                      aria-label={`Ouvrir la conversation de ${d.nom_original}`}
                      title="Ouvrir la conversation"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600"
                    >
                      <MessageSquare className="size-[18px]" aria-hidden="true" />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => telecharger(d)}
                    disabled={telecharge === d.reference_fichier}
                    aria-label={`Télécharger ${d.nom_original}`}
                    title="Télécharger"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                  >
                    {telecharge === d.reference_fichier
                      ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" />
                      : <Download className="size-[18px]" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>

          {peutPlus && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={chargerPlus}
                disabled={chargementPlus}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-60"
              >
                {chargementPlus ? 'Chargement…' : 'Charger plus de documents'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
