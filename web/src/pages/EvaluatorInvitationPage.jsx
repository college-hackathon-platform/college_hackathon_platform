import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getEvaluatorInvitation } from '../services/facultyEvaluatorService'

export default function EvaluatorInvitationPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invitation, setInvitation] = useState(null)

  useEffect(() => {
    getEvaluatorInvitation(token)
      .then((response) => setInvitation(response.data?.data?.invitation))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to validate this evaluator invitation.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <main className="grid min-h-screen place-items-center bg-slate-50"><p className="text-sm font-semibold text-slate-600">Validating invitation…</p></main>

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Invitation unavailable</h1>
            <p className="mt-3 text-sm text-slate-600" role="alert">{error}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Evaluator Invitation</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{invitation.event.title}</h1>
            <p className="mt-3 text-sm text-slate-600">Hello {invitation.name}, you have been invited in the role of <strong>{invitation.designation}</strong>.</p>
            {invitation.organization && <p className="mt-1 text-sm text-slate-600">Organization: {invitation.organization}</p>}
            {invitation.event.description && <p className="mt-5 text-sm leading-6 text-slate-700">{invitation.event.description}</p>}
            {invitation.invitationMessage && <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><strong className="text-sm">Personal message</strong><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{invitation.invitationMessage}</p></div>}
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {invitation.event.startDate && <div className="rounded-lg border border-slate-200 p-3"><dt className="text-xs font-bold uppercase text-slate-500">Event date</dt><dd className="mt-1 text-sm">{new Date(invitation.event.startDate).toLocaleString()}</dd></div>}
              <div className="rounded-lg border border-slate-200 p-3"><dt className="text-xs font-bold uppercase text-slate-500">Location / mode</dt><dd className="mt-1 text-sm">{invitation.event.venue || (invitation.event.mode === 'ONLINE' ? 'Online' : 'To be announced')}</dd></div>
              <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-500">Invitation expires</dt><dd className="mt-1 text-sm">{new Date(invitation.expiresAt).toLocaleString()}</dd></div>
            </dl>
          </>
        )}
      </section>
    </main>
  )
}
