import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import {
  createTeam,
  generateTeamInvitation,
  getMyRegistrations,
  getMyTeams,
  joinTeam,
  getPublishedEvents,
  submitRegistration,
} from '../../services/teamRegistrationService'

function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
  }
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>
}

export default function StudentWorkspace() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [teams, setTeams] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [createEventId, setCreateEventId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eventsResult, teamsResult, registrationsResult] = await Promise.all([
        getPublishedEvents({ page: 1, limit: 100 }),
        getMyTeams({ page: 1, limit: 100 }),
        getMyRegistrations({ page: 1, limit: 100 }),
      ])
      setEvents(eventsResult.data?.data?.events || [])
      setTeams(teamsResult.data?.data?.teams || [])
      setRegistrations(registrationsResult.data?.data?.registrations || [])
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load your team workspace.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function handleCreate(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createTeam({ eventId: createEventId, name: teamName.trim(), description: teamDescription.trim() || null })
      setTeamName('')
      setTeamDescription('')
      setCreateEventId('')
      setFeedback('Team created successfully.')
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to create the team.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(event) {
    event.preventEvent?.()
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await joinTeam(invitationCode.trim())
      setInvitationCode('')
      setFeedback('Invitation accepted. You joined the team.')
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to join the team.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInvitation(teamId) {
    setSubmitting(true)
    setError('')
    try {
      const response = await generateTeamInvitation(teamId)
      const code = response.data?.data?.invitationCode
      setFeedback(code ? `Invitation generated: ${code}` : 'Invitation generated.')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to generate an invitation.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(teamId) {
    setSubmitting(true)
    setError('')
    try {
      await submitRegistration(teamId)
      setFeedback('Team registration submitted successfully.')
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to submit the registration.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Student workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Teams & Registrations</h1>
          <p className="mt-1 text-sm text-slate-500">Discover published events, manage teams, and submit registrations.</p>
        </header>

        {feedback && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{feedback}</div>}
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

        {loading ? (
          <div className="grid min-h-64 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">Loading workspace…</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-5">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Available events</h2>
                {events.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No published events are currently available.</p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {events.map((event) => (
                      <article key={event.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3"><h3 className="font-bold text-slate-900">{event.title}</h3><Badge tone="blue">{event.mode}</Badge></div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.shortDescription || 'No event summary provided.'}</p>
                        <p className="mt-3 text-xs font-semibold text-slate-500">Teams: {event.minTeamSize}–{event.maxTeamSize}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">My teams</h2>
                {teams.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">You have not joined or created a team.</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {teams.map((team) => (
                      <article key={team.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><h3 className="font-bold text-slate-900">{team.name}</h3><p className="mt-1 text-sm text-slate-500">{team.event.title}</p></div>
                          <Badge tone="green">{team.members.filter((member) => member.status === 'ACTIVE').length} member(s)</Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {team.leaderId === user?.id && (
                            <button type="button" disabled={submitting} onClick={() => void handleInvitation(team.id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-blue-600">Generate invitation</button>
                          )}
                          {team.leaderId === user?.id && (
                            <button type="button" disabled={submitting} onClick={() => void handleSubmit(team.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Submit registration</button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">My registrations</h2>
                {registrations.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No registrations submitted.</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {registrations.map((registration) => (
                      <article key={registration.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                        <div><strong className="text-sm text-slate-900">{registration.team.name}</strong><p className="mt-1 text-xs text-slate-500">{registration.event.title}</p></div>
                        <Badge tone={registration.status === 'CONFIRMED' ? 'green' : 'slate'}>{registration.status}</Badge>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="grid h-fit gap-5">
              <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Create a team</h2>
                <label className="text-sm font-semibold text-slate-700">Event<select value={createEventId} onChange={(event) => setCreateEventId(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
                <label className="text-sm font-semibold text-slate-700">Team name<input value={teamName} onChange={(event) => setTeamName(event.target.value)} minLength={2} maxLength={120} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
                <label className="text-sm font-semibold text-slate-700">Description<textarea value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} maxLength={2000} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>
                <button type="submit" disabled={submitting} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-60">{submitting ? 'Creating…' : 'Create team'}</button>
              </form>

              <form onSubmit={handleJoin} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Join with invitation</h2>
                <label className="text-sm font-semibold text-slate-700">Invitation code<input value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} minLength={20} maxLength={128} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm" /></label>
                <button type="submit" disabled={submitting} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 disabled:opacity-60">Join team</button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
