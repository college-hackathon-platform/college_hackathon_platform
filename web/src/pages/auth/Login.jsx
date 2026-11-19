import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { getApiErrorMessage } from '../../services/api'

const rolePaths = {
  ADMIN: '/admin',
  FACULTY: '/faculty',
  STUDENT: '/student',
}

export default function Login() {
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const user = await login({ email: email.trim(), password })
      const destination = location.state?.from?.pathname || rolePaths[user.role] || '/unauthorized'
      navigate(destination, { replace: true })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to sign in. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const notice = location.state?.notice
  const noticeError = location.state?.noticeError

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand" aria-label="College Hackathon Platform">
          <span className="brand-mark">C</span>
          <span>Campus Portal</span>
        </div>
        <p className="auth-eyebrow">Welcome back</p>
        <h1 id="login-title">Sign in to your account</h1>
        <p className="auth-description">Use your institutional account to continue.</p>

        {notice && <p className="form-notice" role="status">{notice}</p>}
        {noticeError && <p className="form-error" role="alert">{noticeError}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={255}
            required
          />

          <div className="password-label-row">
            <label htmlFor="login-password">Password</label>
          </div>
          <div className="password-field">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={128}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New to the platform? <Link to="/register">Create a student account</Link>
        </p>
      </section>
      <p className="auth-footer">College Hackathon &amp; Assessment Platform</p>
    </main>
  )
}
