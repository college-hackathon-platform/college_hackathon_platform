import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import { getAdminSettings, updateAdminSettings } from '../../services/adminSettingsService'
import { getHealth } from '../../services/healthService'
import { getApiErrorMessage } from '../../services/api'

const EMPTY_SETTINGS = {
  platformName: '',
  platformDescription: '',
  supportEmail: '',
  timezone: 'UTC',
  platformStatus: 'ONLINE',
  allowEventCreation: true,
  registrationEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [baseline, setBaseline] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [confirmation, setConfirmation] = useState(false)
  const [health, setHealth] = useState({ loading: true, backend: '', database: '', uptimeSeconds: null, timestamp: '', version: '', error: '' })
  const healthController = useRef(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getAdminSettings()
      const value = response.data?.data?.settings
      if (!value) throw new Error('The server returned invalid settings.')
      setSettings({
        platformName: value.platformName || '',
        platformDescription: value.platformDescription || '',
        supportEmail: value.supportEmail || '',
        timezone: value.timezone || 'UTC',
        platformStatus: value.platformStatus || 'ONLINE',
        allowEventCreation: value.allowEventCreation,
        registrationEnabled: value.registrationEnabled,
        maintenanceMode: value.maintenanceMode,
        maintenanceMessage: value.maintenanceMessage || '',
      })
      setBaseline(JSON.stringify(value))
      setUpdatedAt(value.updatedAt)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load platform settings.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHealth = useCallback(async () => {
    healthController.current?.abort()
    const controller = new AbortController()
    healthController.current = controller
    setHealth((current) => ({ ...current, loading: true, error: '' }))
    try {
      const response = await getHealth({ signal: controller.signal })
      if (!controller.signal.aborted) {
        setHealth({
          loading: false,
          backend: response.services?.api || '',
          database: response.services?.database || '',
          uptimeSeconds: response.uptimeSeconds ?? null,
          timestamp: response.timestamp || '',
          version: response.version || '',
          error: '',
        })
      }
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setHealth({
          loading: false,
          backend: '',
          database: requestError.response?.data?.services?.database || '',
          uptimeSeconds: null,
          timestamp: '',
          version: '',
          error: getApiErrorMessage(requestError, 'Unable to verify system health.'),
        })
      }
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHealth()
    return () => healthController.current?.abort()
  }, [loadHealth])

  useEffect(() => {
    function confirmLeave(event) {
      if (!baseline) return
      const current = JSON.stringify({
        platformName: settings.platformName,
        platformDescription: settings.platformDescription,
        supportEmail: settings.supportEmail,
        timezone: settings.timezone,
        platformStatus: settings.platformStatus,
        allowEventCreation: settings.allowEventCreation,
        registrationEnabled: settings.registrationEnabled,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      })
      const baselineSettings = JSON.parse(baseline)
      const baselineCurrent = JSON.stringify({
        platformName: baselineSettings.platformName,
        platformDescription: baselineSettings.platformDescription,
        supportEmail: baselineSettings.supportEmail,
        timezone: baselineSettings.timezone,
        platformStatus: baselineSettings.platformStatus,
        allowEventCreation: baselineSettings.allowEventCreation,
        registrationEnabled: baselineSettings.registrationEnabled,
        maintenanceMode: baselineSettings.maintenanceMode,
        maintenanceMessage: baselineSettings.maintenanceMessage,
      })
      if (current !== baselineCurrent) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', confirmLeave)
    return () => window.removeEventListener('beforeunload', confirmLeave)
  }, [baseline, settings])

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  async function save() {
    setSaving(true)
    setError('')
    setFeedback('')
    setFieldErrors({})
    try {
      const response = await updateAdminSettings(settings)
      const value = response.data?.data?.settings
      setUpdatedAt(value.updatedAt)
      setBaseline(JSON.stringify(value))
      setFeedback('Platform settings saved successfully.')
      setConfirmation(false)
      await loadHealth()
    } catch (requestError) {
      setFieldErrors(requestError.response?.data?.errors || {})
      setError(getApiErrorMessage(requestError, 'Unable to save platform settings.'))
    } finally {
      setSaving(false)
    }
  }

  function requestSave(event) {
    event.preventDefault()
    const baselineMaintenanceMode = baseline ? Boolean(JSON.parse(baseline).maintenanceMode) : false
    if (settings.maintenanceMode && !baselineMaintenanceMode) setConfirmation(true)
    else void save()
  }

  return (
    <>
      <PageHeader title="Platform Settings" description="Manage platform operations and global configuration." />
      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {error && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert"><span>{error}</span><button type="button" onClick={() => void loadSettings()} className="rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">Retry</button></div>}

      {loading ? <div className="grid min-h-64 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">Loading platform settings…</div> : (
        <form onSubmit={requestSave} className="grid gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">General</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Platform name<input value={settings.platformName} onChange={(event) => update('platformName', event.target.value)} minLength={2} maxLength={180} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" />{fieldErrors.platformName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.platformName}</span>}</label>
              <label className="text-sm font-semibold text-slate-700">Support email<input type="email" value={settings.supportEmail} onChange={(event) => update('supportEmail', event.target.value)} maxLength={255} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" />{fieldErrors.supportEmail && <span className="mt-1 block text-xs text-red-600">{fieldErrors.supportEmail}</span>}</label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Platform description<textarea value={settings.platformDescription} onChange={(event) => update('platformDescription', event.target.value)} maxLength={1000} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
              <label className="text-sm font-semibold text-slate-700">Timezone<input value={settings.timezone} onChange={(event) => update('timezone', event.target.value)} maxLength={100} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" /></label>
              <label className="text-sm font-semibold text-slate-700">Platform status<select value={settings.platformStatus} onChange={(event) => update('platformStatus', event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3"><option value="ONLINE">Online</option><option value="DEGRADED">Degraded</option><option value="MAINTENANCE">Maintenance</option></select></label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Event & Registration</h2>
            <p className="mt-1 text-sm text-slate-500">Global controls do not override event-specific lifecycle and registration date rules.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold"><span>Allow Admin event creation</span><input type="checkbox" checked={settings.allowEventCreation} onChange={(event) => update('allowEventCreation', event.target.checked)} /></label>
              <label className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold"><span>Allow new registrations</span><input type="checkbox" checked={settings.registrationEnabled} onChange={(event) => update('registrationEnabled', event.target.checked)} /></label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Platform Operations</h2>
            <div className="mt-4 grid gap-3">
              <label className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold"><span>Maintenance mode</span><input type="checkbox" checked={settings.maintenanceMode} onChange={(event) => update('maintenanceMode', event.target.checked)} /></label>
              {settings.maintenanceMode && <label className="text-sm font-semibold text-slate-700">Maintenance message<textarea value={settings.maintenanceMessage} onChange={(event) => update('maintenanceMessage', event.target.value)} minLength={1} maxLength={1000} rows={3} required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2" />{fieldErrors.maintenanceMessage && <span className="mt-1 block text-xs text-red-600">{fieldErrors.maintenanceMessage}</span>}</label>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-900">System Health</h2><button type="button" onClick={() => void loadHealth()} disabled={health.loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Retry</button></div>
            {health.loading ? <p className="mt-3 text-sm text-slate-500">Checking system health…</p> : health.error ? <p className="mt-3 text-sm text-red-600" role="alert">{health.error}</p> : <dl className="mt-4 grid gap-3 sm:grid-cols-2">{[['Backend', health.backend], ['Database', health.database], ['Uptime', health.uptimeSeconds === null ? 'Unavailable' : `${Math.floor(health.uptimeSeconds / 60)} minutes`], ['Last check', health.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unavailable'], ['Version', health.version || 'Unavailable']].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><dt className="text-xs font-bold uppercase text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>)}</dl>}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3"><small className="text-xs text-slate-500">{updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : 'Settings are stored in the database.'}</small><button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button></footer>
        </form>
      )}

      {confirmation && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true"><h2 className="text-lg font-bold">Enable maintenance mode?</h2><p className="mt-2 text-sm text-slate-600">Student and Faculty APIs will be blocked. Admin authentication and Admin settings will remain accessible.</p><footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white">{saving ? 'Saving…' : 'Enable maintenance'}</button></footer></section></div>}
    </>
  )
}
