import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'

/* ============================================================
   Constantes
   ============================================================ */
const EXT_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
const MIME_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']

/* ============================================================
   Helpers
   ============================================================ */
export function estImage(f) {
  if (!f) return false
  const nom = (f.nom_original || '').toLowerCase()
  const mime = (f.type_mime || '').toLowerCase()
  return EXT_IMAGES.some((e) => nom.endsWith(e)) || MIME_IMAGES.includes(mime)
}

export function formaterTaille(o) {
  if (!o) return ''
  if (o < 1024) return `${o} o`
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(1)} Ko`
  return `${(o / (1024 * 1024)).toFixed(1)} Mo`
}

function typeDuFichier(nom) {
  const n = nom || ''
  return n.includes('.') ? n.split('.').pop().toUpperCase() : 'FICHIER'
}

/** URL à utiliser : url_preview (signée) sinon fallback sur /api/fichiers/{ref} */
function urlDuFichier(fichier) {
  return fichier.url_preview || `/api/fichiers/${fichier.reference_fichier}`
}

/* ============================================================
   Aperçu d'une image : miniature + bouton télécharger + zoom
   ============================================================ */
function ApercuImage({ fichier }) {
  const [zoom, setZoom] = useState(false)
  const [erreur, setErreur] = useState(false)
  const src = urlDuFichier(fichier)

  // Échap ferme l'image agrandie
  useEffect(() => {
    if (!zoom) return
    const surTouche = (e) => {
      if (e.key === 'Escape') setZoom(false)
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [zoom])

  // Image introuvable ou pas d'URL → fallback carte de téléchargement
  if (erreur || !fichier.url_preview) {
    return <ApercuFichier fichier={fichier} moi={false} />
  }

  return (
    <>
      {/* ---- Miniature dans la bulle ---- */}
      <div className="group relative inline-block max-w-full overflow-hidden rounded-xl bg-black/5 ring-1 ring-slate-200 dark:ring-slate-300">
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="block cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          aria-label={`Agrandir l'image ${fichier.nom_original}`}
        >
          <img
            src={src}
            alt={fichier.nom_original}
            onError={() => setErreur(true)}
            className="block object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style={{
              maxWidth: '260px',
              maxHeight: '260px',
              width: 'auto',
              height: 'auto',
            }}
            loading="lazy"
          />
        </button>

        {/* Bouton télécharger (toujours visible) */}
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
          title="Télécharger"
          aria-label={`Télécharger ${fichier.nom_original}`}
        >
          <Download className="size-3.5" />
        </a>

        {/* Taille (toujours visible, sous le bouton) */}
        <div className="pointer-events-none absolute left-2 top-[42px] z-10 rounded-md bg-black/60 px-1.5 py-0.5 ring-1 ring-white/10 backdrop-blur-sm">
          <p className="text-[11px] font-medium leading-tight text-white">
            {formaterTaille(fichier.taille)}
          </p>
        </div>

        {/* Nom du fichier en bas */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/75 via-black/35 to-transparent px-2.5 py-1.5">
          <p className="truncate text-[11px] font-medium text-white">
            {fichier.nom_original}
          </p>
        </div>
      </div>

      {/* ---- Modale d'agrandissement ---- */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Aperçu de ${fichier.nom_original}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setZoom(false)}
          >
            {/* Boutons en haut à droite, hors du flux flex pour ne pas décaler l'image */}
            <div className="absolute right-4 top-4 z-10 flex gap-2">
              <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/80"
                title="Télécharger"
                aria-label={`Télécharger ${fichier.nom_original}`}
              >
                <Download className="size-5" />
              </a>
              <button
                type="button"
                autoFocus
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(false)
                }}
                className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
                title="Fermer (Échap)"
                aria-label="Fermer l'aperçu"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Image centrée */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              src={src}
              alt={fichier.nom_original}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />

            {/* Légende en bas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white ring-1 ring-white/10 backdrop-blur">
              {fichier.nom_original} · {formaterTaille(fichier.taille)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ============================================================
   Aperçu d'un fichier non-image : carte de téléchargement
   ============================================================ */
function ApercuFichier({ fichier, moi }) {
  const src = urlDuFichier(fichier)

  return (
    <a
      href={src}
      download
      aria-label={`Télécharger ${fichier.nom_original}`}
      className={`group flex items-center gap-3 rounded-xl bg-papier px-3 py-2.5 shadow-sm ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        moi
          ? 'ring-blue-300 hover:bg-blue-50 dark:ring-blue-400/40 dark:hover:bg-blue-400/10'
          : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-300 dark:hover:bg-slate-100'
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-action-600 text-white transition group-hover:bg-action-700">
        <Download className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {fichier.nom_original}
        </span>
        <span className="block text-xs text-slate-500">
          {typeDuFichier(fichier.nom_original)}
          {fichier.taille ? ` · ${formaterTaille(fichier.taille)}` : ''}
        </span>
      </span>
    </a>
  )
}

/* ============================================================
   Conteneur : images et fichiers dans une bulle
   ============================================================ */
export default function ApercuImages({ fichiers, moi }) {
  if (!fichiers || fichiers.length === 0) return null

  const images = fichiers.filter(estImage)
  const autres = fichiers.filter((f) => !estImage(f))

  return (
    <div className="mt-2 space-y-2">
      {/* Images */}
      {images.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${moi ? 'justify-end' : 'justify-start'}`}>
          {images.map((f) => (
            <ApercuImage key={f.reference_fichier} fichier={f} />
          ))}
        </div>
      )}

      {/* Fichiers non-images */}
      {autres.length > 0 && (
        <ul className="space-y-1.5">
          {autres.map((f) => (
            <li key={f.reference_fichier}>
              <ApercuFichier fichier={f} moi={moi} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}