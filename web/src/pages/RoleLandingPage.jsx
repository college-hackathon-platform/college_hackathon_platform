import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function RoleLandingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const roleName = user.role.charAt(0) + user.role.slice(1).toLowerCase()

  async function handleLogout() {
    setIsLoggingOut(true)
    const result = await logout()
    navigate('/login', {
      replace: true,
      state: result.errorMessage
        ? { noticeError: `You were signed out locally, but the server could not confirm logout: ${result.errorMessage}` }
        : { notice: 'You have been signed out.' },
    })
  }

  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="auth-brand">
          <span className="brand-mark">C</span>
          <span>Campus Portal</span>
        </div>
        <span className="role-pill">{roleName}</span>
      </header>
      <section className="landing-card" aria-labelledby="landing-title">
        <p className="auth-eyebrow">Authenticated area</p>
        <h1 id="landing-title">Welcome, {user.name}</h1>
        <p className="auth-description">
          This is a temporary {roleName.toLowerCase()} landing page. Role-specific features will be added later.
        </p>
        <dl className="profile-details">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </section>
      <p className="auth-footer">
        {location.pathname} is protected by backend authentication and frontend role routing.
      </p>
    </main>
  )
}
