import { useState } from 'react'
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

/* ============================================================
   Aperçu d'une image — Bouton ⬇ toujours visible
   ============================================================ */
function ApercuImage({ fichier }) {
  const [zoom, setZoom] = useState(false)
  const src = `/api/fichiers/${fichier.reference_fichier}`

  return (
    <>
      <div className="group relative inline-block max-w-full overflow-hidden rounded-xl bg-black/5">
        {/* Image contrainte à 260×260 max */}
        <img
          src={src}
          alt={fichier.nom_original}
          onClick={() => setZoom(true)}
          className="block cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          style={{
            maxWidth: '260px',
            maxHeight: '260px',
            width: 'auto',
            height: 'auto',
          }}
          loading="lazy"
        />

        {/* Bouton télécharger (toujours visible) */}
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 z-10 flex size-8 items-center justify-center rounded-full
                     bg-black/60 text-white backdrop-blur-sm
                     transition-colors hover:bg-black/80"
          title="Télécharger"
          aria-label="Télécharger"
        >
          <Download className="size-3.5" />
        </a>

        {/* Taille (toujours visible, sous le bouton) */}
        <div className="absolute top-[42px] left-2 z-10 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
          <p className="text-[10px] font-medium leading-tight text-white/90">
            {formaterTaille(fichier.taille)}
          </p>
        </div>

        {/* Nom du fichier en bas */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2.5 py-1.5">
          <p className="truncate text-[10px] font-medium text-white/95">
            {fichier.nom_original}
          </p>
        </div>
      </div>

      {/* Lightbox (image agrandie au clic) */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoom(false)}
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                title="Télécharger"
              >
                <Download className="size-5" />
              </a>
              <button
                type="button"
                onClick={() => setZoom(false)}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                title="Fermer"
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
   Aperçu d'un fichier non-image
   Carte blanche + pastille bleue (même accent pour les deux côtés)
   ============================================================ */
function ApercuFichier({ fichier, moi }) {
  const src = `/api/fichiers/${fichier.reference_fichier}`

  return (
    <a
      href={src}
      download
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 shadow-sm ring-1 transition ${
        moi
          ? 'bg-white/95 ring-white/40 hover:bg-white'
          : 'bg-white ring-slate-300/60 hover:bg-slate-50 hover:ring-slate-300'
      }`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition group-hover:bg-blue-700">
        <Download className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {fichier.nom_original}
        </span>
        <span className="block text-xs text-slate-500">
          {formaterTaille(fichier.taille)}
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
            <ApercuImage key={f.reference_fichier} fichier={f} moi={moi} />
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
