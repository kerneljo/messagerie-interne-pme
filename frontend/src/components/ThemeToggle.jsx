import { useState } from 'react'

const CLE_THEME = 'fulmar:theme'

function themeInitial() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'clair'
}

function appliquer(theme) {
  const racine = document.documentElement
  if (theme === 'dark') racine.dataset.theme = 'dark'
  else delete racine.dataset.theme // thème par défaut (clair teinté bleu)
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(themeInitial)
  const sombre = theme === 'dark'

  function basculer() {
    const suivant = sombre ? 'clair' : 'dark'
    setTheme(suivant)
    appliquer(suivant)
    try { localStorage.setItem(CLE_THEME, suivant) } catch {}
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={sombre ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={sombre ? 'Mode clair' : 'Mode sombre'}
      className={`flex size-11 items-center justify-center rounded-full bg-papier/80 text-slate-600 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-600/40 ${className}`}
    >
      {sombre ? (
        /* Soleil */
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Lune */
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
