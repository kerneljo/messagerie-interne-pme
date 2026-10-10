import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import { ThemeProvider } from './ThemeContext'
import Layout from './components/Layout'
import { Chargement } from './components/ui'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Recus from './pages/Recus'
import Envoyes from './pages/Envoyes'
import Envoyer from './pages/Envoyer'
import NouveauGroupe from './pages/NouveauGroupe'
import Conversations from './pages/Conversations'
import Profil from './pages/Profil'
import ProfilUtilisateur from './pages/ProfilUtilisateur'

// Admin
import AdminLayout from './pages/admin/Layout'
import AdminVueEnsemble from './pages/admin/VueEnsemble'
import AdminUtilisateurs from './pages/admin/Utilisateurs'
import AdminPostes from './pages/admin/Postes'
import AdminServices from './pages/admin/Services'
import AdminRoles from './pages/admin/Roles'
import AdminAudit from './pages/admin/Audit'

function RoutePrivee({ children }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <Chargement />
  return utilisateur ? children : <Navigate to="/login" replace />
}

function RouteAdmin({ children }) {
  const { utilisateur, chargement } = useAuth()
  if (chargement) return <Chargement />
  if (!utilisateur) return <Navigate to="/login" replace />
  if (utilisateur.role?.libelle !== 'Administrateur') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<RoutePrivee><Layout /></RoutePrivee>}>
              <Route index element={<Dashboard />} />
              <Route path="recus" element={<Recus />} />
              <Route path="envoyes" element={<Envoyes />} />
              <Route path="envoyer" element={<Envoyer />} />
              <Route path="conversations" element={<Conversations />} />
              <Route path="conversations/nouveau-groupe" element={<NouveauGroupe />} />
              <Route path="conversations/:reference" element={<Conversations />} />
              <Route path="profil" element={<Profil />} />
              <Route path="utilisateurs/:matricule" element={<ProfilUtilisateur />} />

              {/* Administration — layout + sous-routes */}
              <Route
                path="admin"
                element={<RouteAdmin><AdminLayout /></RouteAdmin>}
              >
                <Route index element={<AdminVueEnsemble />} />
                <Route path="utilisateurs" element={<AdminUtilisateurs />} />
                <Route path="postes" element={<AdminPostes />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="audit" element={<AdminAudit />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
