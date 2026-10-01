import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Layout from './components/Layout'
import { Chargement } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recus from './pages/Recus'
import Envoyes from './pages/Envoyes'
import Envoyer from './pages/Envoyer'
import Conversations from './pages/Conversations'

function RoutePrivee({ children }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <Chargement />
  return utilisateur ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RoutePrivee><Layout /></RoutePrivee>}>
            <Route index element={<Dashboard />} />
            <Route path="recus" element={<Recus />} />
            <Route path="envoyes" element={<Envoyes />} />
            <Route path="envoyer" element={<Envoyer />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="conversations/:reference" element={<Conversations />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
