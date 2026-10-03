import { useEffect, useState } from 'react'

export default function useDebounce(valeur, delai = 300) {
  const [valeurDebouncee, setValeurDebouncee] = useState(valeur)
  useEffect(() => {
    const t = setTimeout(() => setValeurDebouncee(valeur), delai)
    return () => clearTimeout(t)
  }, [valeur, delai])
  return valeurDebouncee
}
