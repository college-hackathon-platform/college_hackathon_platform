import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const rolePaths = {
  ADMIN: '/admin',
  FACULTY: '/faculty',
  STUDENT: '/student',
}

export default function Unauthorized() {
  const { user } = useAuth()

  return (
    <main className="message-page">
      <section className="message-card">
        <p className="auth-eyebrow">Access restricted</p>
        <h1>That area is not available to your account</h1>
        <p className="auth-description">
          {user
            ? `You are signed in as ${user.role}. Choose an area available to your account.`
            : 'Sign in with an account that has permission to continue.'}
        </p>
        <Link className="primary-link" to={rolePaths[user?.role] || '/login'}>
          {user ? 'Go to my account area' : 'Go to sign in'}
        </Link>
      </section>
    </main>
  )
}
