import { useRef, useCallback } from 'react'
import api from '../api'

export default function useSignalerFrappe(referenceConversation) {
  const lastSent = useRef(0)

  return useCallback(() => {
    if (!referenceConversation) return
    const now = Date.now()
    if (now - lastSent.current < 2000) return
    lastSent.current = now
    api.post(`/api/conversations/${referenceConversation}/typing`).catch(() => {})
  }, [referenceConversation])
}
