import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NotFound from './pages/NotFound'
import RoleLandingPage from './pages/RoleLandingPage'
import StatusPage from './pages/StatusPage'
import Unauthorized from './pages/Unauthorized'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import './auth.css'

const rolePaths = {
  ADMIN: '/admin',
  FACULTY: '/faculty',
  STUDENT: '/student',
}

function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return <main className="route-loading" aria-live="polite">Restoring your session…</main>
  }

  return <Navigate to={isAuthenticated ? rolePaths[user.role] || '/unauthorized' : '/login'} replace />
}

function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <main className="route-loading" aria-live="polite">Restoring your session…</main>
  }

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<RoleLandingPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['FACULTY']} />}>
          <Route path="/faculty" element={<RoleLandingPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['STUDENT']} />}>
          <Route path="/student" element={<RoleLandingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
