import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/admin/PageHeader'
import StatCard from '../../components/admin/StatCard'
import EmptyState from '../../components/admin/EmptyState'
import EventStatusBadge from '../../components/admin/EventStatusBadge'
import EventFormModal from '../../components/admin/EventFormModal'
import {
  createAdminEvent,
  getAdminEventById,
  getAdminEvents,
  getAdminEventStatistics,
  updateAdminEvent,
  updateAdminEventStatus,
} from '../../services/adminEventsService'
import { getApiErrorMessage } from '../../services/api'

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function getRegistrationAvailability(event) {
  if (event.status !== 'PUBLISHED') {
    if (event.status === 'DRAFT') return { label: 'Not published', color: 'text-slate-500' }
    if (event.status === 'REGISTRATION_CLOSED') return { label: 'Closed', color: 'text-amber-600' }
    if (event.status === 'COMPLETED') return { label: 'Completed', color: 'text-blue-600' }
    if (event.status === 'CANCELLED') return { label: 'Cancelled', color: 'text-red-600' }
    return { label: 'Unavailable', color: 'text-slate-500' }
  }
  const now = new Date()
  const start = event.registrationStartDate ? new Date(event.registrationStartDate) : null
  const end = event.registrationEndDate ? new Date(event.registrationEndDate) : null
  if (start && now < start) return { label: 'Opens soon', color: 'text-blue-600' }
  if (end && now > end) return { label: 'Deadline passed', color: 'text-amber-600' }
  return { label: 'Open', color: 'text-emerald-600' }
}

function getStatusActionDescription(action, event) {
  const title = event.title
  if (action.status === 'PUBLISHED') return `Publish "${title}"? This will make the event visible and allow registrations when the registration window is open. All required fields will be validated.`
  if (action.status === 'REGISTRATION_CLOSED') return `Close registrations for "${title}"? No new registrations will be accepted. All existing teams and registrations will be preserved.`
  if (action.status === 'COMPLETED') return `Mark "${title}" as completed? The event will be finalized. No new registrations will be accepted. All historical data will be retained.`
  if (action.status === 'CANCELLED') return `Cancel "${title}"? The event will be marked as cancelled. No new registrations will be accepted. All existing teams and registrations will be preserved.`
  return `Change "${title}" to ${action.status.replaceAll('_', ' ').toLowerCase()}?`
}

function ConfirmationModal({ title, description, confirmLabel, onConfirm, onClose, submitting, error, variant = 'default' }) {
  const confirmClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-blue-600 hover:bg-blue-700'
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="status-confirm-title">
        <div className="p-5">
          <h2 id="status-confirm-title" className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} disabled={submitting} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={submitting} className={`min-h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60 ${confirmClass}`}>{submitting ? 'Applying…' : confirmLabel}</button>
        </footer>
      </section>
    </div>
  )
}

function RegistrationSummary({ event }) {
  const regs = event.registrations || []
  const counts = { total: regs.length, submitted: 0, confirmed: 0, rejected: 0, waitlisted: 0, cancelled: 0 }
  for (const r of regs) {
    const key = r.status?.toLowerCase()
    if (key in counts) counts[key]++
  }
  const capacity = event.registrationCapacity
  const utilization = capacity ? `${counts.confirmed + counts.submitted + counts.waitlisted} / ${capacity}` : `${counts.confirmed + counts.submitted + counts.waitlisted}`

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-900">Registration Summary</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><dt className="text-xs text-slate-400">Total</dt><dd className="mt-0.5 text-sm font-bold text-slate-700">{counts.total}</dd></div>
        <div><dt className="text-xs text-slate-400">Confirmed</dt><dd className="mt-0.5 text-sm font-bold text-emerald-600">{counts.confirmed}</dd></div>
        <div><dt className="text-xs text-slate-400">Pending</dt><dd className="mt-0.5 text-sm font-bold text-blue-600">{counts.submitted}</dd></div>
        <div><dt className="text-xs text-slate-400">Waitlisted</dt><dd className="mt-0.5 text-sm font-bold text-amber-600">{counts.waitlisted}</dd></div>
        <div><dt className="text-xs text-slate-400">Rejected</dt><dd className="mt-0.5 text-sm font-bold text-red-600">{counts.rejected}</dd></div>
        <div><dt className="text-xs text-slate-400">Cancelled</dt><dd className="mt-0.5 text-sm font-bold text-slate-500">{counts.cancelled}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        Capacity utilization: <span className="font-bold text-slate-700">{utilization}</span>
        {capacity ? ` (of ${capacity})` : ' (unlimited)'}
      </p>
    </div>
  )
}

function EventDetailsModal({ event, onClose, onEdit, onStatusAction, getStatusActions }) {
  const availability = getRegistrationAvailability(event)
  const facultyAssignments = event.facultyAssignments || []
  const evaluatorInvitations = event.evaluatorInvitations || []
  const pendingEvaluators = evaluatorInvitations.filter(e => e.status === 'PENDING').length

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="max-h-[calc(100svh-32px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="event-details-title">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{event.mode} Event</p>
            <h2 id="event-details-title" className="mt-1 text-xl font-bold text-slate-900">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label="Close details">×</button>
        </header>
        <div className="grid gap-5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className={`text-xs font-bold ${availability.color}`}>{availability.label}</span>
            <span className="font-mono text-xs text-slate-400">{event.slug}</span>
          </div>

          {event.shortDescription && <p className="text-sm font-semibold text-slate-700">{event.shortDescription}</p>}
          {event.description && <p className="text-sm leading-6 text-slate-600 whitespace-pre-wrap">{event.description}</p>}

          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['Registration opens', event.registrationStartDate],
              ['Registration closes', event.registrationEndDate],
              ['Event starts', event.startDate],
              ['Event ends', event.endDate],
              ['Venue', event.venue],
              ['Capacity', event.registrationCapacity],
              ['Team size', `${event.minTeamSize}–${event.maxTeamSize}`],
              ['Created by', event.createdBy?.name],
              ['Created', event.createdAt],
              ['Updated', event.updatedAt],
              ['Published', event.publishedAt],
              ['Cancelled', event.cancelledAt],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <dt className="text-xs font-bold text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-700">
                  {['Registration opens', 'Registration closes', 'Event starts', 'Event ends', 'Created', 'Updated', 'Published', 'Cancelled'].includes(label)
                    ? formatDate(value)
                    : value || 'Not specified'}
                </dd>
              </div>
            ))}
          </dl>

          <RegistrationSummary event={event} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Faculty Assignments</h3>
              {facultyAssignments.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No faculty assigned.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {facultyAssignments.map(a => (
                    <li key={a.id} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{a.faculty?.name || 'Unknown'}</span>
                      {a.faculty?.email && <span className="text-slate-400"> · {a.faculty.email}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Evaluator Invitations</h3>
              <p className="mt-1 text-xs text-slate-500">
                {evaluatorInvitations.length} total
                {pendingEvaluators > 0 && <span className="font-semibold text-amber-600"> · {pendingEvaluators} pending</span>}
              </p>
              {evaluatorInvitations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {evaluatorInvitations.map(inv => (
                    <li key={inv.id} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">{inv.name || 'Unknown'}</span>
                      {inv.email && <span className="text-slate-400"> · {inv.email}</span>}
                      {inv.designation && <span className="text-slate-400"> · {inv.designation}</span>}
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 font-bold text-[10px] ${inv.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : inv.status === 'REVOKED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                        {inv.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {event.eligibility && <div><h3 className="text-sm font-bold text-slate-900">Eligibility</h3><p className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{event.eligibility}</p></div>}
          {event.rules && <div><h3 className="text-sm font-bold text-slate-900">Rules</h3><p className="mt-2 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{event.rules}</p></div>}

          {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => onEdit(event)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Edit Event</button>
              {getStatusActions(event).map(action => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => onStatusAction({ event, status: action.status, label: action.label })}
                  className={`min-h-10 rounded-lg px-4 text-sm font-bold text-white ${action.status === 'CANCELLED' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function AdminEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [statistics, setStatistics] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formEvent, setFormEvent] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detailsEvent, setDetailsEvent] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [statusAction, setStatusAction] = useState(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [search])

  const loadStatistics = useCallback(async () => {
    try {
      const response = await getAdminEventStatistics()
      setStatistics(response.data?.data?.statistics || null)
    } catch {
      setStatistics(null)
    }
  }, [])

  const loadEvents = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const response = await getAdminEvents({
        page,
        limit: pagination.limit,
        search: debouncedSearch,
        status: status || undefined,
        mode: mode || undefined,
        sortBy,
        sortOrder,
      })
      const data = response.data?.data
      setEvents(data?.events || [])
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (requestError) {
      setEvents([])
      setError(getApiErrorMessage(requestError, 'Unable to load events.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, mode, pagination.limit, sortBy, sortOrder, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStatistics()
  }, [loadStatistics])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents(1)
  }, [debouncedSearch, status, mode, sortBy, sortOrder, loadEvents])

  useEffect(() => {
    const eventId = searchParams.get('eventId')
    if (!eventId) return
    setSearchParams({}, { replace: true })
    void openDetails({ id: eventId })
  }, [searchParams, setSearchParams])

  function openCreate() {
    setFormEvent(null)
    setFormOpen(true)
    setActionError('')
  }

  function openEdit(event) {
    setActionError('')
    setFormOpen(true)
    setFormEvent(event)
    setDetailsEvent(null)
  }

  async function openDetails(event) {
    setDetailsLoading(true)
    setActionError('')
    try {
      const response = await getAdminEventById(event.id)
      setDetailsEvent(response.data?.data?.event || event)
    } catch (requestError) {
      setActionError(getApiErrorMessage(requestError, 'Unable to load event details.'))
    } finally {
      setDetailsLoading(false)
    }
  }

  async function submitForm(payload) {
    setSubmitting(true)
    setActionError('')
    setFieldErrors({})
    try {
      if (formEvent) {
        await updateAdminEvent(formEvent.id, payload)
        setFeedback('Event updated successfully.')
      } else {
        const response = await createAdminEvent(payload)
        const createdEvent = response.data?.data?.event
        setFeedback(createdEvent?.slug
          ? `Event draft created successfully. URL Slug: ${createdEvent.slug}`
          : 'Event draft created successfully.')
      }
      setFormOpen(false)
      setFormEvent(null)
      await Promise.all([loadEvents(1), loadStatistics()])
    } catch (requestError) {
      const backendData = requestError.response?.data
      setFieldErrors(backendData?.errors || {})
      setActionError(getApiErrorMessage(requestError, backendData?.message || 'Unable to save the event.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmStatusChange() {
    if (!statusAction) return
    setSubmitting(true)
    setActionError('')
    try {
      await updateAdminEventStatus(statusAction.event.id, statusAction.status)
      setFeedback(`Event changed to ${statusAction.status.replaceAll('_', ' ').toLowerCase()}.`)
      setStatusAction(null)
      setDetailsEvent(null)
      await Promise.all([loadEvents(pagination.page), loadStatistics()])
    } catch (requestError) {
      const backendData = requestError.response?.data
      setActionError(getApiErrorMessage(requestError, backendData?.message || 'Unable to change event status.'))
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusActions(event) {
    if (event.status === 'DRAFT') {
      return [
        { label: 'Publish', status: 'PUBLISHED' },
        { label: 'Cancel', status: 'CANCELLED' },
      ]
    }
    if (event.status === 'PUBLISHED') {
      return [
        { label: 'Close Registration', status: 'REGISTRATION_CLOSED' },
        { label: 'Cancel', status: 'CANCELLED' },
      ]
    }
    if (event.status === 'REGISTRATION_CLOSED') {
      return [
        { label: 'Complete', status: 'COMPLETED' },
        { label: 'Cancel', status: 'CANCELLED' },
      ]
    }
    return []
  }

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatus('')
    setMode('')
  }

  const statCards = statistics ? [
    { label: 'Total Events', value: statistics.total, icon: 'calendar' },
    { label: 'Published', value: statistics.published, icon: 'award' },
    { label: 'Drafts', value: statistics.draft, icon: 'clipboard' },
    { label: 'Completed', value: statistics.completed, icon: 'chart' },
  ] : null

  return (
    <>
      <PageHeader
        title="Event Management"
        description="Create and manage hackathon events, schedules, and lifecycle status."
        actions={<button type="button" onClick={openCreate} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-3 focus:ring-blue-200">+ Create New Event</button>}
      />

      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {actionError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{actionError}</div>}

      {statCards ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Event statistics are unavailable.</div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Events">
        <div className="grid gap-2 border-b border-slate-200 p-4 md:grid-cols-[minmax(220px,1fr)_160px_150px_150px_auto]">
          <label className="sr-only" htmlFor="event-search">Search events</label>
          <input id="event-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or slug" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100" />
          <label className="sr-only" htmlFor="event-status">Status</label>
          <select id="event-status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100">
            <option value="">All statuses</option>
            {['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
          </select>
          <label className="sr-only" htmlFor="event-mode">Mode</label>
          <select id="event-mode" value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100">
            <option value="">All modes</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <label className="sr-only" htmlFor="event-sort">Sort</label>
          <select id="event-sort" value={`${sortBy}:${sortOrder}`} onChange={(event) => {
            const [field, order] = event.target.value.split(':')
            setSortBy(field)
            setSortOrder(order)
          }} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100">
            <option value="createdAt:desc">Newest</option>
            <option value="createdAt:asc">Oldest</option>
            <option value="title:asc">Title A–Z</option>
            <option value="title:desc">Title Z–A</option>
            <option value="startDate:asc">Start date</option>
          </select>
          <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Clear</button>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500" role="status">Loading events…</div>
        ) : error ? (
          <div className="grid min-h-64 place-items-center gap-3 text-center" role="alert">
            <p className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => void loadEvents(pagination.page)} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700">Retry</button>
          </div>
        ) : events.length === 0 ? (
          <EmptyState title="No events found" description="Create an event or adjust the current filters." icon="calendar" />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Event start</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const availability = getRegistrationAvailability(event)
                    return (
                      <tr key={event.id} className="border-t border-slate-100 text-slate-600">
                        <td className="max-w-72 px-4 py-4"><strong className="block truncate text-slate-900">{event.title}</strong><span className="mt-1 block truncate font-mono text-xs text-slate-400">{event.slug}</span></td>
                        <td className="px-4 py-4">{event.mode}</td>
                        <td className="px-4 py-4"><EventStatusBadge status={event.status} /></td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-bold ${availability.color}`}>{availability.label}</span>
                          {event.registrationEndDate && event.status === 'PUBLISHED' && (
                            <span className="mt-0.5 block text-xs text-slate-400">Closes: {formatDate(event.registrationEndDate)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">{formatDate(event.startDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            <button type="button" onClick={() => void openDetails(event)} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50">View</button>
                            {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && <button type="button" onClick={() => openEdit(event)} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50">Edit</button>}
                            {getStatusActions(event).map((action) => (
                              <button key={action.status} type="button" onClick={() => setStatusAction({ event, status: action.status, label: action.label })} className={`rounded-md px-2 py-1.5 text-xs font-bold ${action.status === 'CANCELLED' ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'}`}>{action.label}</button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {events.map((event) => {
                const availability = getRegistrationAvailability(event)
                return (
                  <article key={event.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{event.title}</h2><p className="mt-1 truncate font-mono text-xs text-slate-400">{event.slug}</p></div>
                      <EventStatusBadge status={event.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div><dt className="text-slate-400">Mode</dt><dd className="mt-1 font-semibold text-slate-700">{event.mode}</dd></div>
                      <div><dt className="text-slate-400">Registration</dt><dd className={`mt-1 font-bold ${availability.color}`}>{availability.label}</dd></div>
                      <div><dt className="text-slate-400">Start</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(event.startDate)}</dd></div>
                      {event.registrationEndDate && event.status === 'PUBLISHED' && (
                        <div><dt className="text-slate-400">Reg. closes</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(event.registrationEndDate)}</dd></div>
                      )}
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-1">
                      <button type="button" onClick={() => void openDetails(event)} className="rounded-md bg-slate-50 px-2 py-2 text-xs font-bold text-blue-600">View</button>
                      {event.status !== 'COMPLETED' && event.status !== 'CANCELLED' && <button type="button" onClick={() => openEdit(event)} className="rounded-md bg-slate-50 px-2 py-2 text-xs font-bold text-blue-600">Edit</button>}
                      {getStatusActions(event).map((action) => (
                        <button key={action.status} type="button" onClick={() => setStatusAction({ event, status: action.status, label: action.label })} className={`rounded-md px-2 py-2 text-xs font-bold ${action.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>{action.label}</button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}

        {!loading && !error && events.length > 0 && (
          <footer className="flex min-h-16 flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>{pagination.total} events</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={pagination.page <= 1} onClick={() => void loadEvents(pagination.page - 1)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold disabled:opacity-40">Previous</button>
              <span className="text-xs">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadEvents(pagination.page + 1)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold disabled:opacity-40">Next</button>
            </div>
          </footer>
        )}
      </section>

      {detailsLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="status">
          <div className="rounded-xl border border-slate-200 bg-white px-8 py-6 text-sm font-semibold text-slate-500 shadow-xl">Loading event details…</div>
        </div>
      )}

      {formOpen && <EventFormModal event={formEvent} onClose={() => { setFormOpen(false); setFormEvent(null); setActionError(''); setFieldErrors({}) }} onSubmit={(payload) => void submitForm(payload)} submitting={submitting} error={actionError} fieldErrors={fieldErrors} />}

      {detailsEvent && (
        <EventDetailsModal
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onEdit={openEdit}
          onStatusAction={(action) => { setDetailsEvent(null); setStatusAction(action) }}
          getStatusActions={getStatusActions}
        />
      )}

      {statusAction && (
        <ConfirmationModal
          title={`${statusAction.label} Event`}
          description={getStatusActionDescription(statusAction, statusAction.event)}
          confirmLabel={statusAction.label}
          variant={statusAction.status === 'CANCELLED' ? 'danger' : 'default'}
          onConfirm={() => void confirmStatusChange()}
          onClose={() => { setStatusAction(null); setActionError('') }}
          submitting={submitting}
          error={actionError}
        />
      )}
    </>
  )
}