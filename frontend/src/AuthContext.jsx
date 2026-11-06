import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  // 1. Intercepteur : gérer les erreurs d'authentification (401, 403)
  useEffect(() => {
    const id = api.interceptors.response.use(
      (reponse) => reponse,
      (erreur) => {
        const statut = erreur.response?.status
        const message = erreur.response?.data?.message
        
        // Si le token est invalide/expiré ou le compte désactivé
        if (statut === 401 || (statut === 403 && message === 'Compte desactive.')) {
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
          setUtilisateur(null)
        }
        return Promise.reject(erreur)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, [])

  // 2. Au chargement : vérifier si un token existe et restaurer la session
  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (token) {
      // On configure Axios pour envoyer le token à chaque requête
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      api
        .get('/api/me')
        .then((r) => setUtilisateur(r.data))
        .catch(() => {
          // Token invalide ou expiré
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
          setUtilisateur(null)
        })
        .finally(() => setChargement(false))
    } else {
      setChargement(false)
    }
  }, [])

  // 3. Connexion : récupérer et stocker le token
  async function connexion(email, password) {
    const r = await api.post('/api/login', { email, password })
    const { token, ...user } = r.data

    // Stockage du token
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    
    setUtilisateur(user)
    return user
  }

  // 4. Déconnexion : supprimer le token
  async function deconnexion() {
    try {
      await api.post('/api/logout')
    } finally {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setUtilisateur(null)
    }
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
