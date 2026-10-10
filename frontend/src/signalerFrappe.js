import { useRef, useCallback } from 'react'
import api from './api'

export default function useSignalerFrappe(ref) {
  const lastSent = useRef(0)

  return useCallback(() => {
    if (!ref) return
    const now = Date.now()
    if (now - lastSent.current < 2000) return
    lastSent.current = now
    api.post(`/api/conversations/${ref}/typing`).catch(() => {})
  }, [ref])
}
