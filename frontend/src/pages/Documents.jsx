import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, File, FileImage, FileSpreadsheet, FileText,
  Loader2, MessageSquare, Presentation, Search, FolderOpen, 
  ExternalLink, ArrowUpDown, X, Calendar, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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

const TRIS = [
  { id: 'recent', libelle: 'Plus récents' },
  { id: 'ancien', libelle: 'Plus anciens' },
  { id: 'nom', libelle: 'Nom (A-Z)' },
  { id: 'taille', libelle: 'Taille' },
]

const STYLES = {
  pdf: { icone: FileText, classes: 'bg-red-50 text-red-600', label: 'PDF' },
  texte: { icone: FileText, classes: 'bg-indigo-50 text-indigo-600', label: 'Texte' },
  tableur: { icone: FileSpreadsheet, classes: 'bg-emerald-50 text-emerald-600', label: 'Tableur' },
  presentation: { icone: Presentation, classes: 'bg-amber-50 text-amber-600', label: 'Présentation' },
  image: { icone: FileImage, classes: 'bg-sky-50 text-sky-600', label: 'Image' },
  autre: { icone: File, classes: 'bg-slate-100 text-slate-600', label: 'Fichier' },
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
  const [tri, setTri] = useState('recent')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  
  const [telecharge, setTelecharge] = useState(null)
  const [apercuImage, setApercuImage] = useState(null)

  const rechercheDebouncee = useDebounce(recherche, 300)
  const filtreActif = rechercheDebouncee.trim() !== '' || categorie !== '' || tri !== 'recent' || dateDebut !== '' || dateFin !== ''

  function parametres(extra = {}) {
    return {
      q: rechercheDebouncee.trim() || undefined,
      categorie: categorie || undefined,
      tri: tri || undefined,
      date_debut: dateDebut || undefined,
      date_fin: dateFin || undefined,
      limite: LIMITE,
      ...extra,
    }
  }

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
  }, [rechercheDebouncee, categorie, tri, dateDebut, dateFin])

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

  function fermerApercu() {
    setApercuImage(null)
  }

  function effacerFiltres() {
    setRecherche('')
    setCategorie('')
    setTri('recent')
    setDateDebut('')
    setDateFin('')
  }

  return (
    <>
      <div className="flex h-full flex-col bg-slate-50/50">
        
        {/* ===== En-tête ===== */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur md:px-8">
          <div className="mx-auto max-w-[1600px]">
            
            {/* ✅ Tout est sur la même ligne */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Recherche */}
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-[#16877D] focus:outline-none focus:ring-2 focus:ring-[#16877D]/15"
                />
              </div>

              {/* Filtres par catégorie (sur la même ligne) */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const actif = categorie === c.id
                  return (
                    <button
                      key={c.id || 'tous'}
                      type="button"
                      onClick={() => setCategorie(c.id)}
                      className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16877D] ${
                        actif
                          ? 'border-[#16877D] bg-[#16877D] text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {c.libelle}
                    </button>
                  )
                })}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <Calendar className="size-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  aria-label="Date de début"
                  className="bg-transparent text-xs text-slate-700 outline-none w-28"
                />
                <span className="text-xs text-slate-400">au</span>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  aria-label="Date de fin"
                  className="bg-transparent text-xs text-slate-700 outline-none w-28"
                />
              </div>

              {/* Tri */}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                  <ArrowUpDown className="size-3.5 text-slate-400" />
                  <select
                    value={tri}
                    onChange={(e) => setTri(e.target.value)}
                    className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    {TRIS.map((t) => (
                      <option key={t.id} value={t.id}>{t.libelle}</option>
                    ))}
                  </select>
                </div>

                {filtreActif && (
                  <button
                    type="button"
                    onClick={effacerFiltres}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  >
                    <X className="size-3.5" />
                    Effacer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Contenu ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <div className="mx-auto max-w-[1600px]">
            {erreur && (
              <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
                {erreur}
              </p>
            )}

            {chargement ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <Loader2 className="size-5 animate-spin text-[#16877D]" aria-hidden="true" />
                Chargement des documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <FolderOpen className="size-8" aria-hidden="true" />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-800">
                  {filtreActif ? 'Aucun document ne correspond' : 'Aucun document pour le moment'}
                </p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  {filtreActif
                    ? 'Essayez de modifier vos filtres ou votre recherche.'
                    : 'Les fichiers que vous partagez dans vos conversations apparaîtront ici.'}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-xs font-medium text-slate-500" aria-live="polite">
                  {documents.length}{peutPlus ? '+' : ''} document{documents.length > 1 ? 's' : ''} trouvé{documents.length > 1 ? 's' : ''}
                </p>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {documents.map((d) => {
                    const cat = categorieDe(d.nom_original)
                    const style = STYLES[cat]
                    const Icone = style.icone
                    
                    const estImage = d.type_mime?.startsWith('image/') && !!d.url_preview
                    
                    const auteur = d.envoye_par_moi
                      ? 'Vous'
                      : [d.expediteur?.prenom, d.expediteur?.nom].filter(Boolean).join(' ')

                    return (
                      <div 
                        key={d.reference_fichier} 
                        className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#16877D]/30 hover:shadow-lg isolate"
                      >
                        <div 
                          className="relative w-full shrink-0 overflow-hidden bg-slate-100"
                          style={{ height: '140px', maxHeight: '140px' }}
                        >
                          {estImage ? (
                            <img 
                              src={d.url_preview}
                              alt={d.nom_original}
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <div className={`flex size-16 items-center justify-center rounded-2xl ${style.classes}`}>
                                <Icone className="size-8" aria-hidden="true" />
                              </div>
                            </div>
                          )}

                          {estImage && (
                            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => setApercuImage({ url: d.url_preview, nom: d.nom_original })}
                                title="Voir l'image en grand"
                                className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                              >
                                <Eye className="size-4" />
                              </button>
                              {d.conversation?.reference_conversation && (
                                <Link
                                  to={`/conversations/${d.conversation.reference_conversation}`}
                                  title="Voir dans la conversation"
                                  className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur transition hover:bg-black/70"
                                >
                                  <ExternalLink className="size-4" />
                                </Link>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-bold text-slate-900" title={d.nom_original}>
                                {d.nom_original}
                              </p>
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                {style.label}
                              </span>
                            </div>
                            
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <span className="truncate">
                                <strong className="font-semibold text-slate-700">{auteur}</strong>
                                {' · '}{formaterDate(d.date_envoi)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                            {d.conversation?.titre ? (
                              <span className="flex max-w-[50%] items-center gap-1.5 truncate text-xs font-medium text-slate-500">
                                <MessageSquare className="size-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{d.conversation.titre}</span>
                              </span>
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              onClick={() => telecharger(d)}
                              disabled={telecharge === d.reference_fichier}
                              className="flex items-center gap-1.5 rounded-lg bg-[#16877D]/10 px-2.5 py-1.5 text-xs font-semibold text-[#16877D] transition-colors hover:bg-[#16877D] hover:text-white disabled:opacity-50"
                            >
                              {telecharge === d.reference_fichier ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Download className="size-3.5" />
                              )}
                              Télécharger
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {peutPlus && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={chargerPlus}
                      disabled={chargementPlus}
                      className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#16877D] disabled:opacity-60"
                    >
                      {chargementPlus ? 'Chargement…' : 'Charger plus de documents'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== Modale d'aperçu ===== */}
      <AnimatePresence>
        {apercuImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={fermerApercu}
              className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative flex max-h-full max-w-6xl flex-col items-center"
            >
              <button
                type="button"
                onClick={fermerApercu}
                className="absolute -right-2 -top-12 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:-right-4"
                aria-label="Fermer l'aperçu"
              >
                <X className="size-6" />
              </button>

              <img
                src={apercuImage.url}
                alt={apercuImage.nom}
                className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
              />

              <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                <span className="truncate font-medium">{apercuImage.nom}</span>
                <a
                  href={apercuImage.url}
                  download={apercuImage.nom}
                  className="ml-4 flex shrink-0 items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/30"
                >
                  <Download className="size-3.5" />
                  Télécharger
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
