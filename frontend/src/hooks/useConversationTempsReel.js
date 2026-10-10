import { useEffect, useRef, useState } from 'react'
import echo from '../echo'

export default function useConversationTempsReel(
  referenceConversation,
  onNouveauMessage,
  monMatricule,
) {
  const [typingUsers, setTypingUsers] = useState([])
  const timeoutsRef = useRef({})
  const onNouveauMessageRef = useRef(onNouveauMessage)

  useEffect(() => {
    onNouveauMessageRef.current = onNouveauMessage
  }, [onNouveauMessage])

  useEffect(() => {
    if (!referenceConversation) return

    const channelName = `conversation.${referenceConversation}`
    const channel = echo.private(channelName)

    channel.listen('.MessageEnvoye', (e) => {
      console.log('📨 MessageEnvoye reçu:', e)
      onNouveauMessageRef.current?.(e.message)
    })

    channel.listen('.UtilisateurEcrit', (e) => {
      const key = e.matricule
      if (monMatricule && Number(monMatricule) === Number(e.matricule)) return

      setTypingUsers((prev) =>
        prev.some((u) => u.matricule === key)
          ? prev
          : [...prev, { matricule: key, nom_complet: e.nom_complet }],
      )

      clearTimeout(timeoutsRef.current[key])
      timeoutsRef.current[key] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.matricule !== key))
      }, 3000)
    })

    return () => {
      echo.leave(channelName)
      Object.values(timeoutsRef.current).forEach(clearTimeout)
      timeoutsRef.current = {}
      setTypingUsers([])
    }
  }, [referenceConversation, monMatricule])

  return { typingUsers }
}
