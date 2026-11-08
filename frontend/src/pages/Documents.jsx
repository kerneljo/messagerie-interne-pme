import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Download, File, FileImage, FileSpreadsheet, FileText,
  Loader2, MessageSquare, Search, FolderOpen,
  ExternalLink, ArrowUpDown, X, Calendar, Eye, SlidersHorizontal,
  ChevronDown, Presentation
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api'
import useDebounce from '../useDebounce'
import { messageErreur } from '../utils'

const LIMITE = 30

const FILTRES_RAPIDES = [
  { id: '', libelle: 'Tous' },
  { id: 'image', libelle: 'Images' },
]

const CATEGORIES = [
  { id: '', libelle: 'Tous les types' },
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

// ✅ Couleurs 100% thémées (bleu, indigo, violet, mangue, slate)
const STYLES = {
  pdf: {
    icone: FileText,
    classes: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 dark:from-blue-100 dark:to-blue-200 dark:text-blue-800',
    label: 'PDF',
  },
  texte: {
    icone: FileText,
    classes: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 dark:from-indigo-100 dark:to-indigo-200 dark:text-indigo-800',
    label: 'Texte',
  },
  tableur: {
    icone: FileSpreadsheet,
    classes: 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-200 dark:to-blue-300 dark:text-blue-900',
    label: 'Tableur',
  },
  presentation: {
    icone: Presentation,
    classes: 'bg-gradient-to-br from-violet-100 to-violet-200 text-violet-700 dark:from-violet-100 dark:to-violet-200 dark:text-violet-800',
    label: 'Présentation',
  },
  image: {
    icone: FileImage,
    classes: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-500 dark:from-blue-100 dark:to-blue-200 dark:text-blue-700',
    label: 'Image',
  },
  autre: {
    icone: File,
    classes: 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 dark:from-slate-200 dark:to-slate-300 dark:text-slate-700',
    label: 'Fichier',
  },
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

function estRecent(iso) {
  if (!iso) return false
  const diff = Date.now() - new Date(iso).getTime()
  return diff < 24 * 60 * 60 * 1000
}

const CONTOUR = 'border-slate-200 dark:border-slate-300'
const ERREUR_BLOC = 'border border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200'

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
  const [apercuDocument, setApercuDocument] = useState(null)
  const [filtresOuverts, setFiltresOuverts] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)

  const rechercheDebouncee = useDebounce(recherche, 300)
  const rechercheRef = useRef(null)
  const sentinelleRef = useRef(null)
  const panneauRef = useRef(null)

  const filtreRapideActif = categorie === 'image' ? 'image' : ''

  const nbFiltresActifs = [
    categorie !== '' && categorie !== 'image',
    dateDebut !== '',
    dateFin !== '',
  ].filter(Boolean).length

  const filtreActif = rechercheDebouncee.trim() !== '' || categorie !== '' || tri !== 'recent' || dateDebut !== '' || dateFin !== ''

  // Fermeture panneau au clic extérieur
  useEffect(() => {
    function surClicExterieur(e) {
      if (panneauRef.current && !panneauRef.current.contains(e.target)) {
        setFiltresOuverts(false)
      }
    }
    if (filtresOuverts) {
      document.addEventListener('mousedown', surClicExterieur)
      return () => document.removeEventListener('mousedown', surClicExterieur)
    }
  }, [filtresOuverts])

  // Raccourcis clavier
  useEffect(() => {
    function surTouche(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        rechercheRef.current?.focus()
      }
      if (e.key === 'Escape') {
        if (apercuDocument) setApercuDocument(null)
        if (filtresOuverts) setFiltresOuverts(false)
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [apercuDocument, filtresOuverts])

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

  const chargerPlus = useCallback(async () => {
    if (chargementPlus || !peutPlus) return
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
  }, [documents, peutPlus, chargementPlus, rechercheDebouncee, categorie, tri, dateDebut, dateFin])

  // Scroll infini
  useEffect(() => {
    if (!sentinelleRef.current || !peutPlus) return
    const observateur = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) chargerPlus()
      },
      { rootMargin: '200px' }
    )
    observateur.observe(sentinelleRef.current)
    return () => observateur.disconnect()
  }, [chargerPlus, peutPlus])

  // Chargement du blob PDF pour l'aperçu
  useEffect(() => {
    if (!apercuDocument) {
      setPdfUrl(null)
      return
    }
    const estImage = apercuDocument.type_mime?.startsWith('image/')
    if (estImage) return

    let url = null
    let annule = false
    api.get(`/api/fichiers/${apercuDocument.reference_fichier}`, { responseType: 'blob' })
      .then(({ data }) => {
        if (annule) return
        url = URL.createObjectURL(data)
        setPdfUrl(url)
      })
      .catch(() => setPdfUrl(null))

    return () => {
      annule = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [apercuDocument])

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

  function effacerFiltres() {
    setRecherche('')
    setCategorie('')
    setTri('recent')
    setDateDebut('')
    setDateFin('')
  }

  return (
    <>
      <div className="flex h-full flex-col bg-slate-50">
        {/* ===== En-tête (Filtres) ===== */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-papier/95 px-6 py-4 backdrop-blur md:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Recherche */}
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={rechercheRef}
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un document… (Ctrl+K)"
                  className={`w-full rounded-lg border ${CONTOUR} bg-papier py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15`}
                />
                {recherche && (
                  <button
                    type="button"
                    onClick={() => setRecherche('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Effacer la recherche"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filtres rapides */}
              <div className="flex items-center gap-1.5">
                {FILTRES_RAPIDES.map((f) => {
                  const actif = filtreRapideActif === f.id
                  return (
                    <button
                      key={f.id || 'tous'}
                      type="button"
                      onClick={() => setCategorie(f.id)}
                      className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                        actif
                          ? 'border-action-600 bg-action-600 text-white'
                          : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                      }`}
                    >
                      {f.libelle}
                    </button>
                  )
                })}
              </div>

              {/* Filtres avancés */}
              <div className="relative" ref={panneauRef}>
                <button
                  type="button"
                  onClick={() => setFiltresOuverts((v) => !v)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    nbFiltresActifs > 0
                      ? 'border-action-600 bg-action-600/10 text-action-700 dark:bg-action-600/20 dark:text-action-300'
                      : `${CONTOUR} bg-papier text-slate-700 hover:border-slate-300 hover:bg-slate-50`
                  }`}
                  aria-expanded={filtresOuverts}
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filtres
                  {nbFiltresActifs > 0 && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-action-600 text-[10px] font-bold text-white">
                      {nbFiltresActifs}
                    </span>
                  )}
                  <ChevronDown className={`size-3.5 transition-transform ${filtresOuverts ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {filtresOuverts && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-papier p-4 shadow-xl dark:border-slate-300"
                    >
                      <div className="mb-4">
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Type de fichier
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORIES.map((c) => {
                            const actif = categorie === c.id
                            return (
                              <button
                                key={c.id || 'tous'}
                                type="button"
                                onClick={() => setCategorie(c.id)}
                                className={`whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                                  actif
                                    ? 'border-action-600 bg-action-600 text-white'
                                    : `${CONTOUR} bg-papier text-slate-600 hover:bg-slate-50`
                                }`}
                              >
                                {c.libelle}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Période
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={dateDebut}
                            onChange={(e) => setDateDebut(e.target.value)}
                            aria-label="Date de début"
                            className={`w-full rounded-md border ${CONTOUR} bg-papier px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15`}
                          />
                          <span className="text-xs text-slate-400">au</span>
                          <input
                            type="date"
                            value={dateFin}
                            onChange={(e) => setDateFin(e.target.value)}
                            aria-label="Date de fin"
                            className={`w-full rounded-md border ${CONTOUR} bg-papier px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15`}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-200">
                        <button
                          type="button"
                          onClick={() => { effacerFiltres(); setFiltresOuverts(false) }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Tout effacer
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltresOuverts(false)}
                          className="rounded-md bg-action-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-action-700"
                        >
                          Appliquer
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tri */}
              <div className={`flex items-center gap-1.5 rounded-lg border ${CONTOUR} bg-papier px-2 py-1.5 shadow-sm`}>
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
                  className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  <X className="size-3.5" />
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== Contenu ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <div className="mx-auto max-w-[1600px]">
            {erreur && (
              <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${ERREUR_BLOC}`} role="alert">
                {erreur}
              </p>
            )}

            {chargement ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <Loader2 className="size-5 animate-spin text-blue-600" aria-hidden="true" />
                Chargement des documents…
              </div>
            ) : documents.length === 0 ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-200 text-slate-500">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {documents.map((d) => {
                    const cat = categorieDe(d.nom_original)
                    const style = STYLES[cat]
                    const Icone = style.icone
                    const estImage = d.type_mime?.startsWith('image/') && !!d.url_preview
                    const estPDF = cat === 'pdf'
                    const estNouveau = estRecent(d.date_envoi)

                    const auteur = d.envoye_par_moi
                      ? 'Vous'
                      : [d.expediteur?.prenom, d.expediteur?.nom].filter(Boolean).join(' ')

                    const peutApercevoir = estImage || estPDF

                    return (
                      <div
                        key={d.reference_fichier}
                        className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-papier shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-lg dark:border-slate-300 dark:hover:shadow-black/40 sm:min-h-[260px]"
                      >
                        <div className="flex flex-row sm:flex-col">
                          <div className="relative w-24 shrink-0 overflow-hidden bg-slate-100 sm:h-[120px] sm:w-full">
                            {estImage ? (
                              <img
                                src={d.url_preview}
                                alt={d.nom_original}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <div className={`flex size-12 items-center justify-center rounded-xl border border-white/50 shadow-sm ${style.classes}`}>
                                  <Icone className="size-6" aria-hidden="true" />
                                </div>
                              </div>
                            )}

                            {estNouveau && (
                              <span className="absolute left-2 top-2 rounded-full bg-mangue-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-md">
                                Nouveau
                              </span>
                            )}

                            <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {peutApercevoir && (
                                <button
                                  type="button"
                                  onClick={() => setApercuDocument(d)}
                                  title="Aperçu"
                                  className="rounded-md bg-black/60 p-1.5 text-white backdrop-blur transition hover:bg-black/80"
                                >
                                  <Eye className="size-3.5" />
                                </button>
                              )}
                              {d.conversation?.reference_conversation && (
                                <Link
                                  to={`/conversations/${d.conversation.reference_conversation}`}
                                  title="Voir dans la conversation"
                                  className="rounded-md bg-black/60 p-1.5 text-white backdrop-blur transition hover:bg-black/80"
                                >
                                  <ExternalLink className="size-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-[13px] font-bold leading-tight text-slate-900" title={d.nom_original}>
                                  {d.nom_original}
                                </p>
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                  {style.label}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="truncate">
                                  <strong className="font-semibold text-slate-700">{auteur}</strong>
                                  {' · '}{formaterDate(d.date_envoi)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                              {d.conversation?.titre ? (
                                <span className="flex max-w-[45%] items-center gap-1.5 truncate text-[11px] font-medium text-slate-500">
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
                                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition-colors hover:bg-action-600 hover:text-white disabled:opacity-50"
                              >
                                {telecharge === d.reference_fichier ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Download className="size-3.5" />
                                )}
                                <span className="hidden sm:inline">Télécharger</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div ref={sentinelleRef} className="h-4" />

                {chargementPlus && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Chargement…
                  </div>
                )}

                {!peutPlus && documents.length > 0 && (
                  <p className="mt-8 text-center text-xs text-slate-400">
                    — Fin des documents —
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== Modale d'aperçu ===== */}
      <AnimatePresence>
        {apercuDocument && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApercuDocument(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
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
                onClick={() => setApercuDocument(null)}
                className="absolute -right-2 -top-12 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white sm:-right-4"
                aria-label="Fermer l'aperçu"
              >
                <X className="size-6" />
              </button>

              {apercuDocument.type_mime?.startsWith('image/') ? (
                <img
                  src={apercuDocument.url_preview}
                  alt={apercuDocument.nom_original}
                  className="max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
                />
              ) : pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  title={apercuDocument.nom_original}
                  className="h-[80vh] w-full rounded-lg bg-white shadow-2xl"
                />
              ) : (
                <div className="flex h-64 items-center justify-center gap-2 rounded-lg bg-white/10 px-8 text-white">
                  <Loader2 className="size-5 animate-spin" />
                  Chargement de l'aperçu…
                </div>
              )}

              <div className="mt-4 flex w-full items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
                <span className="truncate font-medium">{apercuDocument.nom_original}</span>
                <button
                  type="button"
                  onClick={() => telecharger(apercuDocument)}
                  className="ml-4 flex shrink-0 items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/30"
                >
                  <Download className="size-3.5" />
                  Télécharger
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}