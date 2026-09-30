import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  // Au chargement : la session existe-t-elle deja ?
  useEffect(() => {
    api
      .get('/api/me')
      .then((r) => setUtilisateur(r.data))
      .catch(() => setUtilisateur(null))
      .finally(() => setChargement(false))
  }, [])

  async function connexion(email, password) {
    await api.get('/sanctum/csrf-cookie') // obtient le cookie CSRF
    const r = await api.post('/api/login', { email, password })
    setUtilisateur(r.data)
  }

  async function deconnexion() {
    await api.post('/api/logout')
    setUtilisateur(null)
  }

  return (
    <AuthContext.Provider value={{ utilisateur, chargement, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
