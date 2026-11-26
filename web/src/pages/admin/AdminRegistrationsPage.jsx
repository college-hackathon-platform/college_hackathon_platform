import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import StatCard from '../../components/admin/StatCard'
import EmptyState from '../../components/admin/EmptyState'
import {
  getAdminRegistrations,
  getAdminRegistrationStatistics,
  getAdminRegistration,
  updateAdminRegistrationStatus,
  getAdminTeams,
  getAdminTeamStatistics,
  getAdminTeam,
} from '../../services/teamRegistrationService'
import { getApiErrorMessage } from '../../services/api'

function Badge({ status }) {
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-50 text-blue-700',
    CONFIRMED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
    WAITLISTED: 'bg-amber-50 text-amber-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[status] || styles.DRAFT}`}>{status?.replaceAll('_', ' ')}</span>
}

export default function AdminRegistrationsPage() {
  const [tab, setTab] = useState('registrations')
  const [registrations, setRegistrations] = useState([])
  const [teams, setTeams] = useState([])
  const [registrationStats, setRegistrationStats] = useState(null)
  const [teamStats, setTeamStats] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [teamPagination, setTeamPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [details, setDetails] = useState(null)
  const [teamDetails, setTeamDetails] = useState(null)
  const [review, setReview] = useState(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const loadRegistrations = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const [listResult, statsResult] = await Promise.all([
        getAdminRegistrations({ page, limit: pagination.limit, search: debouncedSearch, status: status || undefined }),
        getAdminRegistrationStatistics(),
      ])
      setRegistrations(listResult.data?.data?.registrations || [])
      setPagination(listResult.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      setRegistrationStats(statsResult.data?.data?.statistics || null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load registrations.'))
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, debouncedSearch, status])

  const loadTeams = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const [listResult, statsResult] = await Promise.all([
        getAdminTeams({ page, limit: teamPagination.limit, search: debouncedSearch }),
        getAdminTeamStatistics(),
      ])
      setTeams(listResult.data?.data?.teams || [])
      setTeamPagination(listResult.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      setTeamStats(statsResult.data?.data?.statistics || null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load teams.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, teamPagination.limit])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'registrations') void loadRegistrations(1)
    else void loadTeams(1)
  }, [tab, loadRegistrations, loadTeams])

  async function openDetails(id) {
    setError('')
    try {
      const response = await getAdminRegistration(id)
      setDetails(response.data?.data?.registration || null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load registration details.'))
    }
  }

  async function openTeamDetails(id) {
    setError('')
    try {
      const response = await getAdminTeam(id)
      setTeamDetails(response.data?.data?.team || null)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load team details.'))
    }
  }

  async function submitReview() {
    if (!review) return
    setSubmitting(true)
    setError('')
    try {
      await updateAdminRegistrationStatus(review.id, {
        status: review.status,
        ...(review.status === 'REJECTED' ? { reason: reason.trim() } : {}),
      })
      setFeedback(`Registration changed to ${review.status}.`)
      setReview(null)
      setReason('')
      await loadRegistrations(pagination.page)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update registration status.'))
    } finally {
      setSubmitting(false)
    }
  }

  const registrationCards = registrationStats ? [
    { label: 'Total', value: registrationStats.total, icon: 'clipboard' },
    { label: 'Submitted', value: registrationStats.submitted, icon: 'arrow' },
    { label: 'Confirmed', value: registrationStats.confirmed, icon: 'award' },
    { label: 'Waitlisted', value: registrationStats.waitlisted, icon: 'chart' },
  ] : null

  const teamCards = teamStats ? [
    { label: 'Total Teams', value: teamStats.totalTeams, icon: 'users' },
    { label: 'Active Teams', value: teamStats.activeTeams, icon: 'award' },
    { label: 'Active Members', value: teamStats.totalMembers, icon: 'users' },
  ] : null

  return (
    <>
      <PageHeader
        title="Teams & Registrations"
        description="Monitor event teams and review registration submissions."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setTab('registrations')} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === 'registrations' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Registrations</button>
            <button type="button" onClick={() => setTab('teams')} className={`rounded-md px-3 py-2 text-xs font-bold ${tab === 'teams' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Teams</button>
          </div>
        }
      />

      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {tab === 'registrations' && registrationCards && <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{registrationCards.map((card) => <StatCard key={card.label} {...card} />)}</div>}
      {tab === 'teams' && teamCards && <div className="mb-4 grid gap-3 sm:grid-cols-3">{teamCards.map((card) => <StatCard key={card.label} {...card} />)}</div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'registrations' ? 'Search event, team, or leader' : 'Search team name'} className="min-h-11 min-w-64 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100" />
          {tab === 'registrations' && (
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="">All statuses</option>
              {['SUBMITTED', 'CONFIRMED', 'REJECTED', 'WAITLISTED', 'CANCELLED'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading…</div>
        ) : tab === 'registrations' ? (
          registrations.length === 0 ? <EmptyState title="No registrations found" description="Registrations will appear after teams submit them." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="border-t border-slate-100 text-slate-600">
                      <td className="px-4 py-4 font-mono text-xs">{registration.id.slice(0, 8)}</td>
                      <td className="px-4 py-4">{registration.event.title}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{registration.team.name}</td>
                      <td className="px-4 py-4">{registration.team.members.filter((member) => member.status === 'ACTIVE').length}</td>
                      <td className="px-4 py-4"><Badge status={registration.status} /></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => void openDetails(registration.id)} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600">View</button>
                          {registration.status === 'SUBMITTED' && <>
                            <button type="button" onClick={() => setReview({ id: registration.id, status: 'CONFIRMED' })} className="rounded-md px-2 py-1.5 text-xs font-bold text-emerald-700">Confirm</button>
                            <button type="button" onClick={() => setReview({ id: registration.id, status: 'WAITLISTED' })} className="rounded-md px-2 py-1.5 text-xs font-bold text-amber-700">Waitlist</button>
                            <button type="button" onClick={() => setReview({ id: registration.id, status: 'REJECTED' })} className="rounded-md px-2 py-1.5 text-xs font-bold text-red-700">Reject</button>
                          </>}
                          {registration.status === 'WAITLISTED' && <>
                            <button type="button" onClick={() => setReview({ id: registration.id, status: 'CONFIRMED' })} className="rounded-md px-2 py-1.5 text-xs font-bold text-emerald-700">Confirm</button>
                            <button type="button" onClick={() => setReview({ id: registration.id, status: 'REJECTED' })} className="rounded-md px-2 py-1.5 text-xs font-bold text-red-700">Reject</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          teams.length === 0 ? <EmptyState title="No teams found" description="Teams will appear after students create them." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Team</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Leader</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
                <tbody>{teams.map((team) => <tr key={team.id} className="border-t border-slate-100 text-slate-600"><td className="px-4 py-4 font-semibold text-slate-900">{team.name}</td><td className="px-4 py-4">{team.event.title}</td><td className="px-4 py-4">{team.leader.name}</td><td className="px-4 py-4">{team.members.filter((member) => member.status === 'ACTIVE').length}</td><td className="px-4 py-4"><Badge status={team.status} /></td><td className="px-4 py-4"><button type="button" onClick={() => void openTeamDetails(team.id)} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600">View</button></td></tr>)}</tbody>
              </table>
            </div>
          )
        )}

        {!loading && tab === 'registrations' && registrations.length > 0 && (
          <footer className="flex min-h-16 items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>{pagination.total} registrations</span>
            <div className="flex items-center gap-2"><button type="button" disabled={pagination.page <= 1} onClick={() => void loadRegistrations(pagination.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadRegistrations(pagination.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div>
          </footer>
        )}
        {!loading && tab === 'teams' && teams.length > 0 && (
          <footer className="flex min-h-16 items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            <span>{teamPagination.total} teams</span>
            <div className="flex items-center gap-2"><button type="button" disabled={teamPagination.page <= 1} onClick={() => void loadTeams(teamPagination.page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {teamPagination.page} of {teamPagination.totalPages}</span><button type="button" disabled={teamPagination.page >= teamPagination.totalPages} onClick={() => void loadTeams(teamPagination.page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div>
          </footer>
        )}
      </section>

      {details && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetails(null)}>
          <section className="max-h-[calc(100svh-32px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Registration details</p><h2 className="mt-1 text-lg font-bold text-slate-900">{details.team.name}</h2></div><button type="button" onClick={() => setDetails(null)} className="grid size-9 place-items-center rounded-lg border border-slate-200">×</button></header>
            <div className="grid gap-4 p-5 text-sm">
              <div className="flex items-center justify-between"><strong>{details.event.title}</strong><Badge status={details.status} /></div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Team leader</dt><dd className="mt-1 font-semibold">{details.team.leader.name}<span className="ml-1 text-xs text-slate-400">({details.team.leader.email})</span></dd></div>
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Submitted</dt><dd className="mt-1 font-semibold">{details.registeredAt ? new Date(details.registeredAt).toLocaleString() : 'Not submitted'}</dd></div>
                {details.reviewedAt && <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Reviewed</dt><dd className="mt-1 font-semibold">{new Date(details.reviewedAt).toLocaleString()}{details.reviewedBy && <span className="ml-1 text-xs text-slate-400">by {details.reviewedBy.name}</span>}</dd></div>}
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Event status</dt><dd className="mt-1"><Badge status={details.event.status} /></dd></div>
              </dl>
              <div><h3 className="font-bold text-slate-900">Members</h3><ul className="mt-2 grid gap-2">{details.team.members.map((member) => <li key={member.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2"><span className="font-semibold">{member.user.name}<span className="ml-1 text-xs font-normal text-slate-400">{member.user.email}</span></span><span className="text-xs text-slate-500">{member.role} · {member.status}</span></li>)}</ul></div>
              {details.history && details.history.length > 0 && <div><h3 className="font-bold text-slate-900">Status history</h3><ul className="mt-2 grid gap-1">{details.history.map((entry) => <li key={entry.id} className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-600"><Badge status={entry.fromStatus} /><span>→</span><Badge status={entry.toStatus} />{entry.changedBy && <span className="text-slate-400">by {entry.changedBy.name}</span>}<span className="text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span>{entry.reason && <span className="w-full text-slate-500 italic">{entry.reason}</span>}</li>)}</ul></div>}
              {details.rejectionReason && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">Rejection reason: {details.rejectionReason}</p>}
            </div>
          </section>
        </div>
      )}

      {teamDetails && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTeamDetails(null)}>
          <section className="max-h-[calc(100svh-32px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <header className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Team details</p><h2 className="mt-1 text-lg font-bold text-slate-900">{teamDetails.name}</h2></div><button type="button" onClick={() => setTeamDetails(null)} className="grid size-9 place-items-center rounded-lg border border-slate-200">×</button></header>
            <div className="grid gap-4 p-5 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Event</dt><dd className="mt-1 font-semibold">{teamDetails.event?.title || '—'}</dd></div>
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Team status</dt><dd className="mt-1"><Badge status={teamDetails.status} /></dd></div>
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Leader</dt><dd className="mt-1 font-semibold">{teamDetails.leader?.name}<span className="ml-1 text-xs font-normal text-slate-400">{teamDetails.leader?.email}</span></dd></div>
                <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-400">Created</dt><dd className="mt-1 font-semibold">{new Date(teamDetails.createdAt).toLocaleString()}</dd></div>
              </dl>
              <div><h3 className="font-bold text-slate-900">Members ({teamDetails.members?.filter((m) => m.status === 'ACTIVE').length} active)</h3><ul className="mt-2 grid gap-2">{teamDetails.members?.map((member) => <li key={member.id} className="flex justify-between rounded-lg border border-slate-100 px-3 py-2"><span className="font-semibold">{member.user?.name}{member.role === 'LEADER' && <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Leader</span>}<span className="ml-1 text-xs font-normal text-slate-400">{member.user?.email}</span></span><span className="text-xs text-slate-500">{member.status}</span></li>)}</ul></div>
              {teamDetails.registrations?.length > 0 && <div><h3 className="font-bold text-slate-900">Registrations</h3><ul className="mt-2 grid gap-2">{teamDetails.registrations.map((reg) => <li key={reg.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"><span className="font-mono text-xs text-slate-500">{reg.id.slice(0, 8)}</span><Badge status={reg.status} />{reg.registeredAt && <span className="text-xs text-slate-400">{new Date(reg.registeredAt).toLocaleString()}</span>}</li>)}</ul></div>}
            </div>
          </section>
        </div>
      )}

      {review && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && setReview(null)}>
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true">
            <div className="p-5"><h2 className="text-lg font-bold text-slate-900">Change registration status</h2><p className="mt-2 text-sm text-slate-600">Set this registration to <strong>{review.status}</strong>?</p>{review.status === 'REJECTED' && <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={2000} required placeholder="Rejection reason" className="mt-4 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />}</div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={() => setReview(null)} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button type="button" onClick={() => void submitReview()} disabled={submitting || (review.status === 'REJECTED' && reason.trim().length < 3)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Applying…' : 'Confirm'}</button></footer>
          </section>
        </div>
      )}
    </>
  )
}
