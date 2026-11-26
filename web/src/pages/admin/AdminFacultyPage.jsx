import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import EmptyState from '../../components/admin/EmptyState'
import { getFaculty, getFacultyDetails, assignFaculty, removeFacultyAssignment } from '../../services/facultyEvaluatorService'
import { getAdminEvents } from '../../services/adminEventsService'
import { getApiErrorMessage } from '../../services/api'

const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  SUSPENDED: 'bg-red-50 text-red-700',
}

const EVENT_STATUS_BADGE = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-blue-50 text-blue-700',
  REGISTRATION_CLOSED: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

export default function AdminFacultyPage() {
  const [faculty, setFaculty] = useState([])
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [details, setDetails] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [eventId, setEventId] = useState('')
  const [removeTarget, setRemoveTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef(null)

  // Debounce search input — fires request 350 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const [facultyResult, eventsResult] = await Promise.all([
        getFaculty({ page, limit: pagination.limit, search: debouncedSearch, status: status || undefined }),
        getAdminEvents({ page: 1, limit: 100 }),
      ])
      setFaculty(facultyResult.data?.data?.faculty || [])
      setPagination(facultyResult.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      setEvents(eventsResult.data?.data?.events || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load Faculty accounts.'))
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, debouncedSearch, status])

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1)
  }, [load])

  async function openDetails(facultyId) {
    setError('')
    try {
      const response = await getFacultyDetails(facultyId)
      setDetails(response.data?.data?.faculty || null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load Faculty details.'))
    }
  }

  async function submitAssignment() {
    if (!assignTarget || !eventId) return
    setSubmitting(true)
    setError('')
    try {
      await assignFaculty(eventId, assignTarget.id)
      setFeedback(`${assignTarget.name} was assigned successfully.`)
      setAssignTarget(null)
      setEventId('')
      await load(pagination.page)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to assign Faculty.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitRemoval() {
    if (!removeTarget) return
    setSubmitting(true)
    setError('')
    try {
      await removeFacultyAssignment(removeTarget.eventId, removeTarget.facultyId)
      setFeedback('Faculty assignment removed successfully.')
      setRemoveTarget(null)
      setDetails(null)
      await load(pagination.page)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to remove the assignment.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Eligible events for assignment (exclude cancelled and completed)
  const eligibleEvents = events.filter((e) => e.status !== 'CANCELLED' && e.status !== 'COMPLETED')

  const selectedEvent = events.find((e) => e.id === eventId)

  return (
    <>
      <PageHeader
        title="Faculty Management"
        description="Manage Faculty accounts and event assignments."
      />

      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load(pagination.page)} className="rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">Retry</button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search + Filter toolbar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Faculty name or email"
            className="min-h-11 min-w-64 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading Faculty…</div>
        ) : faculty.length === 0 ? (
          <EmptyState title="No Faculty found" description="Provision Faculty accounts through User Management." icon="faculty" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignments</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="px-4 py-4 font-semibold text-slate-900">{member.name}</td>
                    <td className="px-4 py-4 text-slate-600">{member.email}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[member.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{member.assignmentCount}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => void openDetails(member.id)} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600">View</button>
                        {member.status === 'ACTIVE' && (
                          <button type="button" onClick={() => setAssignTarget(member)} className="rounded-md px-2 py-1.5 text-xs font-bold text-slate-600">Assign</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => void load(pagination.page - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="flex items-center px-1 text-xs text-slate-600">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => void load(pagination.page + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Faculty Details Modal */}
      {details && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setDetails(null)}
        >
          <section className="max-h-[calc(100svh-32px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-bold uppercase text-blue-600">Faculty details</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{details.name}</h2>
              </div>
              <button type="button" onClick={() => setDetails(null)} className="grid size-9 place-items-center rounded-lg border border-slate-200">×</button>
            </header>
            <div className="p-5">
              <p className="text-sm text-slate-600">{details.email}</p>
              <p className="mt-1">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[details.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {details.status}
                </span>
              </p>
              <h3 className="mt-5 text-sm font-bold text-slate-900">Assigned events</h3>
              {details.facultyAssignments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No event assignments.</p>
              ) : (
                <div className="mt-2 grid gap-2">
                  {details.facultyAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                      <div>
                        <strong className="text-sm text-slate-900">{assignment.event.title}</strong>
                        <p className="mt-0.5 flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${EVENT_STATUS_BADGE[assignment.event.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {assignment.event.status}
                          </span>
                          {assignment.assignedAt && (
                            <span className="text-xs text-slate-400">
                              Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                      {details.status === 'ACTIVE' && assignment.event.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget({ eventId: assignment.event.id, facultyId: details.id })}
                          className="rounded-md px-2 py-1.5 text-xs font-bold text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Assign Faculty Modal */}
      {assignTarget && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && !submitting && setAssignTarget(null)}
        >
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold text-slate-900">Assign {assignTarget.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Select an event to assign this faculty member to.</p>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Event
              <select
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              >
                <option value="">Select event…</option>
                {eligibleEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} [{event.status}]
                  </option>
                ))}
              </select>
            </label>

            {selectedEvent && (
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className={`mr-2 rounded-full px-2 py-0.5 font-bold ${EVENT_STATUS_BADGE[selectedEvent.status] ?? 'bg-slate-100 text-slate-600'}`}>
                  {selectedEvent.status}
                </span>
                {selectedEvent.startDate && (
                  <span>Starts {new Date(selectedEvent.startDate).toLocaleDateString()}</span>
                )}
              </div>
            )}

            <footer className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setAssignTarget(null); setEventId('') }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !eventId}
                onClick={() => void submitAssignment()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? 'Assigning…' : 'Assign'}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Remove Assignment Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold text-slate-900">Remove Faculty assignment?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes the assignment from the event but does not change or delete the Faculty account.
            </p>
            <footer className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitRemoval()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? 'Removing…' : 'Remove'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
