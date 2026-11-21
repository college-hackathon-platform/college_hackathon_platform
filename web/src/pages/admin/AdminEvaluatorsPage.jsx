import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../../components/admin/PageHeader'
import EmptyState from '../../components/admin/EmptyState'
import { getAdminEvents } from '../../services/adminEventsService'
import {
  getEventEvaluators,
  inviteEvaluator,
  revokeEvaluatorInvitation,
  regenerateEvaluatorInvitation,
  resendEvaluatorInvitation,
} from '../../services/facultyEvaluatorService'
import { getApiErrorMessage } from '../../services/api'

const EMPTY_FORM = { name: '', email: '', designation: '', organization: '', phone: '', invitationMessage: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s().-]{6,19}$/

export default function AdminEvaluatorsPage() {
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [invitations, setInvitations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
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
        emailDeliveryStatus: deliveryStatus || undefined,
      })
      setInvitations(response.data?.data?.invitations || [])
      setPagination(response.data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load evaluator invitations.'))
    } finally {
      setLoading(false)
    }
  }, [eventId, pagination.limit, search, status, deliveryStatus])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1)
  }, [load])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  function validateForm() {
    const nextErrors = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.'
    if (!EMAIL_PATTERN.test(form.email.trim())) nextErrors.email = 'Please provide a valid email address.'
    if (form.designation.trim().length < 2) nextErrors.designation = 'Designation is required.'
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) nextErrors.phone = 'Please provide a valid phone number.'
    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function submitInvitation(event) {
    event.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    setError('')
    setFeedback('')
    try {
      const response = await inviteEvaluator(eventId, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        designation: form.designation.trim(),
        organization: form.organization.trim(),
        phone: form.phone.trim(),
        invitationMessage: form.invitationMessage.trim(),
      })
      const data = response.data?.data
      if (data?.emailDelivered) setFeedback('Evaluator invitation created and email sent successfully.')
      else setFeedback('Evaluator invitation created, but email delivery failed. Use Resend to retry.')
      setForm(EMPTY_FORM)
      setInviteOpen(false)
      if (data?.copyableLink) setConfirmation({ type: 'copy', invitation: data.invitation, link: data.copyableLink })
      await load(pagination.page)
    } catch (requestError) {
      const responseErrors = requestError.response?.data?.errors
      if (responseErrors) setFieldErrors(responseErrors)
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
        setConfirmation(null)
      } else if (confirmation.type === 'regenerate') {
        const response = await regenerateEvaluatorInvitation(confirmation.invitation.id)
        const data = response.data?.data
        setFeedback(data?.emailDelivered ? 'Invitation regenerated and email sent.' : 'Invitation regenerated, but email delivery failed.')
        setConfirmation(data?.copyableLink ? { type: 'copy', invitation: data.invitation, link: data.copyableLink } : null)
      } else if (confirmation.type === 'resend') {
        const response = await resendEvaluatorInvitation(confirmation.invitation.id)
        const data = response.data?.data
        setFeedback(data?.emailDelivered ? 'Evaluator invitation email sent successfully.' : 'Email resend failed. The invitation remains retryable.')
        setConfirmation(data?.copyableLink ? { type: 'copy', invitation: data.invitation, link: data.copyableLink } : null)
      }
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
      <PageHeader title="Evaluator Management" description="Create and manage event-specific evaluator invitations." actions={<button type="button" disabled={!eventId} onClick={() => { setFieldErrors({}); setInviteOpen(true) }} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">Invite Evaluator</button>} />
      {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
      {error && <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert"><span>{error}</span><button type="button" onClick={() => void load(pagination.page)} className="rounded-lg border border-red-200 bg-white px-3 py-2 font-bold">Retry</button></div>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="min-h-11 min-w-64 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} disabled={!eventId} placeholder="Search name, email or designation" className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-slate-50" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!eventId} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All invitation statuses</option><option value="PENDING">Pending</option><option value="REVOKED">Revoked</option><option value="EXPIRED">Expired</option></select>
          <select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} disabled={!eventId} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">All email statuses</option><option value="PENDING">Pending email</option><option value="SENT">Email sent</option><option value="FAILED">Email failed</option></select>
        </div>

        {loading ? <div className="grid min-h-64 place-items-center text-sm font-semibold text-slate-500">Loading evaluator invitations…</div>
          : !eventId ? <EmptyState title="Select an event" description="Choose an event to view its evaluator invitations." icon="award" />
          : invitations.length === 0 ? <EmptyState title="No evaluator invitations" description="Invite an evaluator for this event." icon="award" />
          : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500"><tr><th className="px-4 py-3">Evaluator</th><th className="px-4 py-3">Designation</th><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Invitation</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{invitations.map((invitation) => (
            <tr key={invitation.id} className="border-t border-slate-100">
              <td className="px-4 py-4"><strong className="block text-slate-900">{invitation.name}</strong><span className="text-slate-500">{invitation.email}</span></td>
              <td className="px-4 py-4 text-slate-700">{invitation.designation}</td>
              <td className="px-4 py-4 text-slate-600">{invitation.organization || '—'}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${invitation.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{invitation.status}</span></td>
              <td className="px-4 py-4"><span className={`block rounded-full px-2.5 py-1 text-xs font-bold ${invitation.emailDeliveryStatus === 'SENT' ? 'bg-emerald-50 text-emerald-700' : invitation.emailDeliveryStatus === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{invitation.emailDeliveryStatus === 'SENT' ? 'Email Sent' : invitation.emailDeliveryStatus === 'FAILED' ? 'Email Failed' : 'Pending Delivery'}</span>{invitation.emailDeliveryError && <small className="mt-1 block max-w-48 text-red-600">{invitation.emailDeliveryError}</small>}</td>
              <td className="px-4 py-4 text-slate-600">{new Date(invitation.expiresAt).toLocaleString()}</td>
              <td className="px-4 py-4"><div className="flex flex-wrap gap-1">{invitation.status === 'PENDING' && <><button type="button" onClick={() => setConfirmation({ type: 'resend', invitation })} className="rounded-md px-2 py-1.5 text-xs font-bold text-emerald-700">Resend</button><button type="button" onClick={() => setConfirmation({ type: 'revoke', invitation })} className="rounded-md px-2 py-1.5 text-xs font-bold text-red-600">Revoke</button><button type="button" onClick={() => setConfirmation({ type: 'regenerate', invitation })} className="rounded-md px-2 py-1.5 text-xs font-bold text-blue-600">Regenerate</button></>}</div></td>
            </tr>
          ))}</tbody></table></div>}
      </section>

      {inviteOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && setInviteOpen(false)}><section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true"><h2 className="text-lg font-bold text-slate-900">Invite evaluator</h2><form onSubmit={submitInvitation} className="mt-4 grid gap-3 sm:grid-cols-2">
        {[['name','Full Name','text'],['email','Email','email'],['designation','Designation','text'],['organization','Organization / Institution','text'],['phone','Phone Number','tel']].map(([field, label, type]) => <label key={field} className="text-sm font-semibold text-slate-700">{label}{field === 'email' ? <span className="text-red-500"> *</span> : field !== 'organization' && field !== 'phone' ? <span className="text-red-500"> *</span> : null}<input type={type} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} required={['name','email','designation'].includes(field)} maxLength={field === 'email' ? 255 : field === 'phone' ? 40 : 255} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3" />{fieldErrors[field] && <span className="mt-1 block text-xs text-red-600">{fieldErrors[field]}</span>}</label>)}
        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Personal invitation message<textarea value={form.invitationMessage} onChange={(event) => updateForm('invitationMessage', event.target.value)} maxLength={2000} rows={4} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2" />{fieldErrors.invitationMessage && <span className="mt-1 block text-xs text-red-600">{fieldErrors.invitationMessage}</span>}</label>
        <footer className="mt-2 flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setInviteOpen(false)} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Cancel</button><button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{submitting ? 'Sending…' : 'Send Invitation'}</button></footer>
      </form></section></div>}

      {confirmation && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !submitting && confirmation.type !== 'copy' && setConfirmation(null)}><section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true">{confirmation.type === 'copy' ? <><h2 className="text-lg font-bold">Secure invitation link</h2><p className="mt-2 break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-600">{confirmation.link}</p><p className="mt-2 text-xs text-slate-500">Copy this link only when email delivery is unavailable or retry is not desired.</p><footer className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Close</button><button type="button" onClick={() => void copyLink(confirmation.link)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">Copy link</button></footer></> : <><h2 className="text-lg font-bold">{confirmation.type === 'revoke' ? 'Revoke invitation?' : confirmation.type === 'resend' ? 'Resend invitation?' : 'Regenerate invitation?'}</h2><p className="mt-2 text-sm text-slate-600">{confirmation.type === 'revoke' ? 'The existing invitation link will stop working immediately.' : confirmation.type === 'resend' ? 'A new secure link will replace the previous link and the email will be retried.' : 'The previous link will be invalidated and replaced with a new secure link.'}</p><footer className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmation(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={submitting} onClick={() => void submitConfirmation()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{submitting ? 'Applying…' : 'Confirm'}</button></footer></>}</section></div>}
    </>
  )
}
