import { ChevronLeft, ChevronRight } from 'lucide-react'
import { couleurAvatar, initiales } from '../utils'

// Avatars « carrés arrondis » (rayon proportionnel à la taille) : signature visuelle du thème
const TAILLES_AVATAR = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base', xl: 'size-20 text-xl' }

export function Avatar({ prenom, nom, taille = 'md', photoUrl, className = '' }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${prenom} ${nom}`}
        className={`inline-flex shrink-0 items-center justify-center rounded-[30%] object-cover ${TAILLES_AVATAR[taille]} ${className}`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[30%] font-display font-bold ${TAILLES_AVATAR[taille]} ${couleurAvatar(`${prenom}${nom}`)} ${className}`}
    >
      {initiales(prenom, nom)}
    </span>
  )
}

/** Les deux bulles de la marque (piment + mangue). */
export function LogoBulles({ className = 'size-10' }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden="true">
      <rect x="2" y="4" width="26" height="22" rx="9" fill="#d1451f" />
      <path d="M8 26 6 35l10-8Z" fill="#d1451f" />
      <rect x="16" y="14" width="26" height="22" rx="9" fill="#ffc247" />
      <path d="M36 36l3 7-9-7Z" fill="#ffc247" />
    </svg>
  )
}

// Boutons d'action : coin inférieur gauche carré, comme une bulle de message
const VARIANTES = {
  primaire: 'rounded-xl rounded-bl-[5px] bg-blue-600 text-white hover:bg-blue-700',
  secondaire: 'rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  fantome: 'rounded-xl text-slate-600 hover:bg-slate-100',
  danger: 'rounded-xl rounded-bl-[5px] bg-red-600 text-white hover:bg-red-700',
}

export function Bouton({ variante = 'secondaire', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  )
}

export function Carte({ className = '', children }) {
  return <div className={`rounded-2xl border border-slate-200 bg-papier shadow-sm ${className}`}>{children}</div>
}

export function Chargement({ texte = 'Chargement...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      {texte}
    </div>
  )
}

export function EtatVide({ icone: Icone, titre, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      {Icone && <Icone className="size-10 text-slate-300" />}
      <p className="font-medium text-slate-700">{titre}</p>
      {children && <p className="max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  )
}

export function Pagination({ page, derniere, total, onChange, unite = 'message' }) {
  if (!derniere || derniere <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>{total} {unite}{total > 1 ? 's' : ''}</span>
      <div className="flex items-center gap-2">
        <Bouton disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
          <ChevronLeft className="size-4" />
        </Bouton>
        <span>{page} / {derniere}</span>
        <Bouton disabled={page >= derniere} onClick={() => onChange(page + 1)} aria-label="Page suivante">
          <ChevronRight className="size-4" />
        </Bouton>
      </div>
    </div>
  )
}
