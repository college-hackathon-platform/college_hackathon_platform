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
import AdminLayout from './components/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import PlaceholderPage from './components/admin/PlaceholderPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminEventsPage from './pages/admin/AdminEventsPage'
import AdminRegistrationsPage from './pages/admin/AdminRegistrationsPage'
import StudentWorkspace from './pages/student/StudentWorkspace'
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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="events" element={<AdminEventsPage />} />
            <Route path="registrations" element={<AdminRegistrationsPage />} />
            <Route path="faculty" element={<PlaceholderPage title="Faculty Management" description="Manage faculty accounts and assignments." moduleName="Faculty management" />} />
            <Route path="evaluators" element={<PlaceholderPage title="Evaluators" description="Manage event-specific evaluator assignments." moduleName="Evaluator management" />} />
            <Route path="analytics" element={<PlaceholderPage title="Reports & Analytics" description="Review platform reports and analytics." moduleName="Reports and analytics" />} />
            <Route path="settings" element={<PlaceholderPage title="Platform Settings" description="Configure platform-wide preferences." moduleName="Platform settings" />} />
            <Route path="*" element={<PlaceholderPage title="Page not found" description="The requested Admin page could not be found." moduleName="This page" />} />
          </Route>
        </Route>
        <Route element={<RoleRoute allowedRoles={['FACULTY']} />}>
          <Route path="/faculty" element={<RoleLandingPage />} />
        </Route>
        <Route element={<RoleRoute allowedRoles={['STUDENT']} />}>
          <Route path="/student" element={<StudentWorkspace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
