import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'

const EXT_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
const MIME_IMAGES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']

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

/** Extension en majuscules (PDF, XLSX…) pour reconnaître le type d'un coup d'œil. */
function typeDuFichier(nom) {
  const n = nom || ''
  return n.includes('.') ? n.split('.').pop().toUpperCase() : 'FICHIER'
}

/* ============================================================
   Aperçu d'une image : bouton ⬇ et taille toujours visibles,
   clic ou Entrée pour agrandir, Échap pour fermer
   ============================================================ */
function ApercuImage({ fichier }) {
  const [zoom, setZoom] = useState(false)
  const [erreur, setErreur] = useState(false)
  const src = `/api/fichiers/${fichier.reference_fichier}`

  // Échap ferme l'image agrandie
  useEffect(() => {
    if (!zoom) return
    const surTouche = (e) => { if (e.key === 'Escape') setZoom(false) }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [zoom])

  // Image introuvable ou refusée : on retombe sur la carte de téléchargement
  if (erreur) return <ApercuFichier fichier={fichier} moi={false} />

  return (
    <>
      <div className="group relative inline-block max-w-full overflow-hidden rounded-xl bg-black/5">
        {/* Image contrainte à 260×260 max, ouverte par un vrai bouton (accessible au clavier) */}
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
          className="absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
          title="Télécharger"
          aria-label={`Télécharger ${fichier.nom_original}`}
        >
          <Download className="size-3.5" />
        </a>

        {/* Taille (toujours visible, sous le bouton) */}
        <div className="pointer-events-none absolute left-2 top-[42px] z-10 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
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

      {/* Image agrandie */}
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
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoom(false)}
          >
            <div className="absolute right-4 top-4 flex gap-2">
              <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                title="Télécharger"
                aria-label={`Télécharger ${fichier.nom_original}`}
              >
                <Download className="size-5" />
              </a>
              <button
                type="button"
                autoFocus
                onClick={() => setZoom(false)}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                title="Fermer (Échap)"
                aria-label="Fermer l'aperçu"
              >
                <X className="size-5" />
              </button>
            </div>
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white backdrop-blur">
              {fichier.nom_original} · {formaterTaille(fichier.taille)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ============================================================
   Aperçu d'un fichier non-image : carte blanche avec contour,
   lisible aussi bien dans une bulle envoyée (lagon pâle) que reçue (blanche)
   ============================================================ */
function ApercuFichier({ fichier, moi }) {
  const src = `/api/fichiers/${fichier.reference_fichier}`

  return (
    <a
      href={src}
      download
      aria-label={`Télécharger ${fichier.nom_original}`}
      className={`group flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        moi
          ? 'ring-indigo-300 hover:bg-indigo-50'
          : 'ring-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition group-hover:bg-blue-700">
        <Download className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {fichier.nom_original}
        </span>
        <span className="block text-xs text-slate-600">
          {typeDuFichier(fichier.nom_original)}
          {fichier.taille ? ` · ${formaterTaille(fichier.taille)}` : ''}
        </span>
      </span>
    </a>
  )
}

/* ============================================================
   Conteneur
   ============================================================ */
export default function ApercuImages({ fichiers, moi }) {
  if (!fichiers || fichiers.length === 0) return null

  const images = fichiers.filter(estImage)
  const autres = fichiers.filter((f) => !estImage(f))

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${moi ? 'justify-end' : 'justify-start'}`}>
          {images.map((f) => (
            <ApercuImage key={f.reference_fichier} fichier={f} />
          ))}
        </div>
      )}
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
