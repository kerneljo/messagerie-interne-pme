import { useEffect } from 'react'

/** Appelle `fn` quand on clique en dehors de l'élément référencé (menus déroulants). */
export default function useClickDehors(ref, fn) {
  useEffect(() => {
    const surClic = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fn()
    }
    document.addEventListener('mousedown', surClic)
    return () => document.removeEventListener('mousedown', surClic)
  }, [ref, fn])
}
