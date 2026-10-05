import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null)
  const [chargement, setChargement] = useState(true)

  // Session expirée ou compte désactivé : retour à la page de connexion
  useEffect(() => {
    const id = api.interceptors.response.use(
      (reponse) => reponse,
      (erreur) => {
        const statut = erreur.response?.status
        const message = erreur.response?.data?.message
        if (statut === 401 || (statut === 403 && message === 'Compte desactive.')) {
          setUtilisateur(null)
        }
        return Promise.reject(erreur)
      }
    )
    return () => api.interceptors.response.eject(id)
  }, [])

  // Au chargement : la session existe-t-elle déjà ?
  useEffect(() => {
    api
      .get('/api/me')
      .then((r) => setUtilisateur(r.data))
      .catch(() => setUtilisateur(null))
      .finally(() => setChargement(false))
  }, [])

  async function connexion(email, password) {
    await api.get('/sanctum/csrf-cookie')
    const r = await api.post('/api/login', { email, password })
    setUtilisateur(r.data)
  }

  /**
   * Inscription publique.
   * ⚠️ Le compte est créé en attente de validation par un administrateur.
   * L'utilisateur N'EST PAS connecté automatiquement.
   */
  async function inscription({ nom, prenom, email, codePoste, password, passwordConfirmation }) {
    await api.get('/sanctum/csrf-cookie')
    const r = await api.post('/api/register', {
      nom,
      prenom,
      email,
      code_poste: codePoste,
      password,
      password_confirmation: passwordConfirmation,
    })
    // ⚠️ NE PAS appeler setUtilisateur — le compte doit être validé
    // On retourne juste la réponse pour que Register.jsx puisse l'utiliser
    return r.data
  }

  async function deconnexion() {
    try {
      await api.post('/api/logout')
    } finally {
      setUtilisateur(null)
    }
  }

  return (
    <AuthContext.Provider value={{ utilisateur, chargement, connexion, inscription, deconnexion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
