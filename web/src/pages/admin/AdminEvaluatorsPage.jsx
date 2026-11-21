import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import EmptyState from '../../components/admin/EmptyState'
import { getAdminEvents } from '../../services/adminEventsService'
import {
  getEventEvaluators,
  inviteEvaluator,
  revokeEvaluatorInvitation,
  regenerateEvaluatorInvitation,
} from '../../services/facultyEvaluatorService'
import { getApiErrorMessage } from '../../services/api'

export default function AdminEvaluatorsPage() {
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getAdminEvents({ page: 1, limit: 100 })
      .then((response) => setEvents(response.data?.data?.events || []))
      .catch((requestError) => setError(getApiErrorMessage(requestError, 'Unable to load events.')))
  }, [])

  const load = useCallback(async (page = 1) => {
    if (!eventId) {
      setInvitations([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await getEventEvaluators(eventId, {
        page,
        limit: pagination.limit,
        search,
        status: status || undefined,
      })
      setInvitations(response.data?.data?.invitations || [])
      setPagination(response.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load evaluator invitations.'))
    } finally {
      setLoading(false)
    }
  }, [eventId, pagination.limit, search, status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1)
  }, [load])

  async function submitInvitation(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await inviteEvaluator(eventId, { name: name.trim(), email: email.trim() })
      const data = response.data?.data
      setFeedback(data?.emailDeliveryConfigured
        ? 'Evaluator invitation created.'
        : 'Evaluator invitation created. Email delivery is not configured; copy the invitation link below.')
      setEmail('')
      setName('')
      setInviteOpen(false)
      if (data?.copyableLink) {
        setConfirmation({ type: 'copy', invitation: data.invitation, link: data.copyableLink, secret: data.invitationSecret })
      }
      await load(pagination.page)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create evaluator invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitConfirmation() {
    if (!confirmation) return
    setSubmitting(true)
    setError('')
    try {
      if (confirmation.type === 'revoke') {
        await revokeEvaluatorInvitation(confirmation.invitation.id)
        setFeedback('Evaluator invitation revoked.')
      } else if (confirmation.type === 'regenerate') {
        const response = await regenerateEvaluatorInvitation(confirmation.invitation.id)
        const data = response.data?.data
        setFeedback('Evaluator invitation regenerated. Email delivery is not configured.')
        setConfirmation({ type: 'copy', invitation: data.invitation, link: data.copyableLink, secret: data.invitationSecret })
        await load(pagination.page)
        setSubmitting(false)
        return
      }
      setConfirmation(null)
      await load(pagination.page)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update the evaluator invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`)
      setFeedback('Invitation link copied.')
    } catch {
      setError('The browser could not copy the invitation link.')
    }
  }

  return (
    <>
      <PageHeader
        title="Evaluator Management"
        description="Create and manage event-specific evaluator invitations."
        actions={<button type="button" disabled={!eventId} onClick={() => setInviteOpen(true)} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">Invite Evaluator</button>}
      />

      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert"><span>{error}</span><button type="button" onClick={() => void load(pagination.page)} className="rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">Retry</button></div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="min-h-11 min-w-64 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!eventId} placeholder="Search name or email" className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-50" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!eventId} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></select>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading evaluator invitations…</div>
        ) : !eventId ? (
          <EmptyState title="Select an event" description="Choose an event to view its evaluator invitations." icon="award" />
        ) : invitations.length === 0 ? (
          <EmptyState title="No evaluator invitations" description="Invite an evaluator for this event." icon="award" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Evaluator</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>{invitations.map((invitation) => (
                <tr key={invitation.id} className="border-t border-slate-100">
                  <td className="px-4 py-4 font-semibold text-slate-900">{invitation.name}</td>
                  <td className="px-4 py-4 text-slate-600">{invitation.email}</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${invitation.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{invitation.status}</span></td>
                  <td className="px-4 py-4 text-slate-600">{new Date(invitation.expiresAt).toLocaleString()}</td>
                  <td className="px-4 py-4">{invitation.status === 'PENDING' && <div className="flex gap-1"><button type="button" onClick={() => setConfirmation({ type: 'revoke', invitation })} className="rounded-md px-2 py-1.5 text-xs font-bold text-red-600">Revoke</button><button type="button" onClick={() => setConfirmation({ type: 'regenerate', invitation })} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600">Regenerate</button></div>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {inviteOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && setInviteOpen(false)}>
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold text-slate-900">Invite evaluator</h2>
            <form onSubmit={submitInvitation} className="mt-4 grid gap-3">
              <label className="text-sm font-semibold text-slate-700">Name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={255} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" /></label>
              <label className="text-sm font-semibold text-slate-700">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" /></label>
              <p className="text-xs leading-5 text-slate-500">Email delivery is not configured. This creates a secure copyable invitation link for manual sharing.</p>
              <footer className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setInviteOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Cancel</button><button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{submitting ? 'Creating…' : 'Create invitation'}</button></footer>
            </form>
          </section>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && confirmation.type !== 'copy' && setConfirmation(null)}>
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">
            {confirmation.type === 'copy' ? (
              <>
                <h2 className="text-lg font-bold">Secure invitation link</h2>
                <p className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-600">{confirmation.link}</p>
                <p className="mt-2 text-xs text-slate-500">This is a copy-only preview. Email delivery and evaluator acceptance are not implemented.</p>
                <footer className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Close</button><button type="button" onClick={() => void copyLink(confirmation.link)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Copy link</button></footer>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">{confirmation.type === 'revoke' ? 'Revoke invitation?' : 'Regenerate invitation?'}</h2>
                <p className="mt-2 text-sm text-slate-600">{confirmation.type === 'revoke' ? 'The existing secret will stop working immediately.' : 'The previous secret will be invalidated and a new one created.'}</p>
                <footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={submitting} onClick={() => void submitConfirmation()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{submitting ? 'Applying…' : 'Confirm'}</button></footer>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}
