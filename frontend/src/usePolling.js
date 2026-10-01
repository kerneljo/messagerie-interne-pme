import { useEffect } from 'react'

/**
 * Appelle `fn` tout de suite puis toutes les `delai` ms, seulement si l'onglet est visible.
 * `fn` doit être mémorisée (useCallback) : quand elle change, le cycle redémarre.
 * (Solution simple en attendant le temps réel avec Reverb.)
 */
export default function usePolling(fn, delai) {
  useEffect(() => {
    fn()
    const id = setInterval(() => {
      if (!document.hidden) fn()
    }, delai)
    const surVisibilite = () => {
      if (!document.hidden) fn()
    }
    document.addEventListener('visibilitychange', surVisibilite)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', surVisibilite)
    }
  }, [fn, delai])
}
