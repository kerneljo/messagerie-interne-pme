import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ZoomIn } from 'lucide-react'

const EXT_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
const EXT_IMAGES_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp']

export function estImage(fichier) {
  if (!fichier) return false
  const nom = (fichier.nom_original || '').toLowerCase()
  const mime = (fichier.type_mime || '').toLowerCase()
  return (
    EXT_IMAGES.some((ext) => nom.endsWith(ext)) ||
    EXT_IMAGES_MIME.includes(mime)
  )
}

export function formaterTaille(octets) {
  if (!octets) return ''
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

/* ============================================================
   Aperçu d'une image avec miniature + lightbox
   ============================================================ */
export function ApercuImage({ fichier, url, moi }) {
  const [lightbox, setLightbox] = useState(false)
  const src = url || `/api/fichiers/${fichier.reference_fichier}`

  return (
    <>
      {/* Miniature inline */}
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="group relative block w-full max-w-[320px] overflow-hidden rounded-xl border border-slate-200/50 bg-black/5 transition hover:ring-2 hover:ring-blue-400/50"
      >
        <img
          src={src}
          alt={fichier.nom_original}
          className="block h-auto max-h-64 w-full object-cover"
          loading="lazy"
        />

        {/* Overlay au survol */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg">
            <ZoomIn className="size-5" />
          </div>
        </div>

        {/* Infos bas */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
          <span className="truncate">{fichier.nom_original}</span>
          <span className="shrink-0 opacity-80">{formaterTaille(fichier.taille)}</span>
        </div>
      </button>

      {/* Lightbox plein écran */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(false)}
          >
            {/* Boutons */}
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
                onClick={() => setLightbox(false)}
                className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                title="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Image */}
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

            {/* Nom + taille en bas */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
              {fichier.nom_original} · {formaterTaille(fichier.taille)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ============================================================
   Aperçu d'un fichier non-image (téléchargeable)
   ============================================================ */
export function ApercuFichier({ fichier, moi }) {
  const src = `/api/fichiers/${fichier.reference_fichier}`

  return (
    <a
      href={src}
      download
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
        moi
          ? 'bg-blue-700/50 hover:bg-blue-700'
          : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
      }`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
        moi ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
      }`}>
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{fichier.nom_original}</span>
        <span className={`block text-xs ${moi ? 'text-blue-100' : 'text-slate-500'}`}>
          {formaterTaille(fichier.taille)}
        </span>
      </span>
    </a>
  )
}

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
            <ApercuImage key={f.reference_fichier} fichier={f} moi={moi} />
          ))}
        </div>
      )}

      {/* Autres fichiers */}
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
