import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import { getHealth } from '../services/healthService'

function getStatusLabel(status) {
  if (status === 'checking') return 'Checking…'
  if (status === 'connected') return 'Connected successfully'
  if (status === 'unavailable') return 'Unavailable'
  if (status === 'failed') return 'Connection failed'
  return 'Not verified'
}

export default function StatusPage() {
  const [health, setHealth] = useState({
    backend: 'checking',
    database: 'checking',
    message: '',
    error: '',
  })
  const controllerRef = useRef(null)

  const loadHealth = useCallback(async (signal) => {
    try {
      const data = await getHealth({ signal })
      return {
        backend: data.success === true || data.services?.api === 'operational' ? 'connected' : 'failed',
        database: data.services?.database === 'connected' ? 'connected' : 'unknown',
        message: data.message || '',
        error: '',
      }
    } catch (error) {
      const data = error.response?.data
      return {
        backend: data?.services?.api === 'operational' ? 'connected' : 'failed',
        database: data?.services?.database === 'unavailable'
          ? 'unavailable'
          : data?.services?.database === 'connected'
            ? 'connected'
            : 'unknown',
        message: data?.message || '',
        error: data?.message || 'Unable to reach the backend. Check that it is running and try again.',
      }
    }
  }, [])

  const checkHealth = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setHealth({ backend: 'checking', database: 'checking', message: '', error: '' })
    const result = await loadHealth(controller.signal)
    if (!controller.signal.aborted) {
      setHealth(result)
    }
  }, [loadHealth])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    void loadHealth(controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setHealth(result)
      }
    })
    return () => controllerRef.current?.abort()
  }, [loadHealth])

  return (
    <main className="status-page">
      <section className="status-panel" aria-labelledby="status-title">
        <p className="eyebrow">Development environment</p>
        <h1 id="status-title">College Hackathon Platform</h1>
        <p className="intro">Frontend and backend connectivity status</p>
        <div className="status-list" aria-live="polite">
          <div className="status-row">
            <span>Frontend</span>
            <span className="status-value connected">React application running</span>
          </div>
          <div className="status-row">
            <span>Backend</span>
            <span className={`status-value ${health.backend}`}>{getStatusLabel(health.backend)}</span>
          </div>
          <div className="status-row">
            <span>Database</span>
            <span className={`status-value ${health.database}`}>{getStatusLabel(health.database)}</span>
          </div>
        </div>
        {health.message && (
          <div className="api-response">
            <h2>API response</h2>
            <p>{health.message}</p>
          </div>
        )}
        {health.error && <p className="error-message" role="alert">{health.error}</p>}
        <div className="status-actions">
          <button
            type="button"
            className="retry-button"
            onClick={() => void checkHealth()}
            disabled={health.backend === 'checking'}
          >
            {health.backend === 'checking' ? 'Checking…' : 'Retry connection'}
          </button>
          <Link to="/login">Sign in</Link>
        </div>
      </section>
    </main>
  )
}
