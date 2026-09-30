import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'

function Accueil() {
  const { utilisateur, deconnexion } = useAuth()
  return (
    <main style={{ maxWidth: 600, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Messagerie interne</h1>
      <p>
        Connecte : {utilisateur.prenom} {utilisateur.nom} ({utilisateur.role.libelle} -{' '}
        {utilisateur.service.nom_service})
      </p>
      <button onClick={deconnexion}>Se deconnecter</button>
    </main>
  )
}

function RoutePrivee({ children }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <p>Chargement...</p>
  return utilisateur ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoutePrivee><Accueil /></RoutePrivee>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
