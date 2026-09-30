import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { utilisateur, connexion } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  if (utilisateur) return <Navigate to="/" replace />

  async function soumettre(e) {
    e.preventDefault()
    setErreur('')
    setEnvoi(true)
    try {
      await connexion(email, motDePasse)
      navigate('/', { replace: true })
    } catch (err) {
      setErreur(err.response?.data?.message || 'Erreur de connexion.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Connexion</h1>
      <form onSubmit={soumettre}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            style={{ display: 'block', width: '100%', marginBottom: 12 }}
          />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', marginBottom: 12 }}
          />
        </label>
        {erreur && <p style={{ color: '#b3261e' }}>{erreur}</p>}
        <button type="submit" disabled={envoi}>
          {envoi ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
