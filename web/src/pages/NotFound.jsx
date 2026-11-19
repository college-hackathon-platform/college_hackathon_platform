import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="message-page">
      <section className="message-card">
        <p className="auth-eyebrow">404 · Page not found</p>
        <h1>We could not find that page</h1>
        <p className="auth-description">The address may be incorrect or the page may have moved.</p>
        <Link className="primary-link" to="/">Return to the portal</Link>
      </section>
    </main>
  )
}
