import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './api'
import usePolling from './usePolling'

const Contexte = createContext(null)

/** Liste des conversations partagée (liste, badges, notifications) : une seule requête périodique. */
export function MessagerieProvider({ children }) {
  const [conversations, setConversations] = useState([])
  const [pret, setPret] = useState(false)

  const recharger = useCallback(async () => {
    try {
      const { data } = await api.get('/api/conversations')
      setConversations(data)
    } catch {
      // erreur réseau ponctuelle : le prochain cycle réessaie
    } finally {
      setPret(true)
    }
  }, [])

  usePolling(recharger, 60000)

  const conversationsNonLues = useMemo(() => conversations.filter((c) => c.non_lus > 0), [conversations])
  const nonLus = useMemo(() => conversations.reduce((total, c) => total + c.non_lus, 0), [conversations])

  useEffect(() => {
    document.title = nonLus > 0 ? `(${nonLus}) Messagerie interne` : 'Messagerie interne'
  }, [nonLus])

  const valeur = useMemo(
    () => ({ conversations, conversationsNonLues, nonLus, recharger, pret }),
    [conversations, conversationsNonLues, nonLus, recharger, pret]
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useMessagerie() {
  return useContext(Contexte)
}
