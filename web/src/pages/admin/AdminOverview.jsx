import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/admin/EmptyState'
import PageHeader from '../../components/admin/PageHeader'
import QuickActionCard from '../../components/admin/QuickActionCard'
import SectionCard from '../../components/admin/SectionCard'
import StatCard from '../../components/admin/StatCard'
import { getAdminUserStatistics } from '../../services/adminUsersService'
import { getAdminEvents, getAdminEventStatistics } from '../../services/adminEventsService'
import {
  getAdminRegistrationStatistics,
  getAdminTeamStatistics,
} from '../../services/teamRegistrationService'
import { getApiErrorMessage } from '../../services/api'

export default function AdminOverview() {
  const [userStats, setUserStats] = useState(null)
  const [eventStats, setEventStats] = useState(null)
  const [teamStats, setTeamStats] = useState(null)
  const [registrationStats, setRegistrationStats] = useState(null)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      getAdminUserStatistics(),
      getAdminEventStatistics(),
      getAdminTeamStatistics(),
      getAdminRegistrationStatistics(),
      getAdminEvents({
        page: 1,
        limit: 5,
        status: 'PUBLISHED',
        sortBy: 'startDate',
        sortOrder: 'asc',
      }),
    ])

    const [usersResult, eventsResult, teamsResult, registrationsResult, upcomingResult] = results
    const failures = []

    if (usersResult.status === 'fulfilled') {
      setUserStats(usersResult.value.data?.data?.statistics || null)
    } else {
      setUserStats(null)
      failures.push(getApiErrorMessage(usersResult.reason, 'Unable to load user statistics.'))
    }

    if (eventsResult.status === 'fulfilled') {
      setEventStats(eventsResult.value.data?.data?.statistics || null)
    } else {
      setEventStats(null)
      failures.push(getApiErrorMessage(eventsResult.reason, 'Unable to load event statistics.'))
    }

    setTeamStats(teamsResult.status === 'fulfilled'
      ? teamsResult.value.data?.data?.statistics || null
      : null)
    setRegistrationStats(registrationsResult.status === 'fulfilled'
      ? registrationsResult.value.data?.data?.statistics || null
      : null)

    if (upcomingResult.status === 'fulfilled') {
      setUpcomingEvents(upcomingResult.value.data?.data?.events || [])
    } else {
      setUpcomingEvents([])
      failures.push(getApiErrorMessage(upcomingResult.reason, 'Unable to load upcoming events.'))
    }

    setError(failures.length ? failures.join(' ') : '')
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOverview()
  }, [loadOverview])

  const userCards = [
    { label: 'Total Users', value: userStats?.totalUsers, description: 'Real platform account count', icon: 'users' },
    { label: 'Students', value: userStats?.students, description: 'Student accounts', icon: 'users' },
    { label: 'Faculty', value: userStats?.faculty, description: 'Faculty accounts', icon: 'faculty' },
    { label: 'Active Users', value: userStats?.activeUsers, description: 'Accounts currently active', icon: 'clipboard' },
  ]

  const eventCards = [
    { label: 'Total Events', value: eventStats?.total, description: 'All event records', icon: 'calendar' },
    { label: 'Published', value: eventStats?.published, description: 'Currently published', icon: 'award' },
    { label: 'Drafts', value: eventStats?.draft, description: 'Not yet published', icon: 'clipboard' },
    { label: 'Completed', value: eventStats?.completed, description: 'Completed events', icon: 'chart' },
  ]

  const suspendedInactive = userStats
    ? (typeof userStats.suspendedUsers === 'number' ? userStats.suspendedUsers : 0)
    : null

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Administrative summary and shortcuts."
        actions={
          <Link
            className="admin-primary-button"
            to="/admin/events"
          >
            <span className="admin-button-plus">+</span>
            Create event
          </Link>
        }
      />

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="min-h-9 rounded-lg border border-red-200 bg-white px-3 font-bold text-red-700 hover:bg-red-100 focus:outline-none focus:ring-3 focus:ring-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading platform statistics" aria-live="polite">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">User overview</h2>
            {suspendedInactive !== null && (
              <span className="text-xs font-semibold text-slate-500">
                Suspended users: {suspendedInactive}
              </span>
            )}
          </div>
          <div className="admin-stat-grid" aria-label="User statistics">
            {userCards.map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
                value={typeof stat.value === 'number' ? stat.value : 'Not available'}
              />
            ))}
          </div>

          <div className="mb-3 mt-5">
            <h2 className="text-sm font-bold text-slate-700">Event overview</h2>
          </div>
          <div className="admin-stat-grid" aria-label="Event statistics">
            {eventCards.map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
                value={typeof stat.value === 'number' ? stat.value : 'Not available'}
              />
            ))}
          </div>
        </>
      )}

      <div className="admin-overview-grid">
        <SectionCard title="Recent activity" description="Latest platform actions">
          <EmptyState
            icon="clipboard"
            title="No recent activity available"
            description="Activity data has not been connected."
          />
        </SectionCard>

        <SectionCard title="Upcoming events" description="Scheduled hackathons" action={<Link className="admin-text-link" to="/admin/events">View events</Link>}>
          {loading ? (
            <div className="h-32 animate-pulse rounded-b-xl bg-slate-100" />
          ) : upcomingEvents.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No upcoming published events"
              description="There are no published events with an available start date."
              action={<Link className="admin-text-link" to="/admin/events">Open Events</Link>}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingEvents.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  to="/admin/events"
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-blue-100"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-slate-900">{event.title}</strong>
                    <small className="mt-1 block text-slate-500">{event.slug}</small>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-blue-600">
                    {event.startDate
                      ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(event.startDate))
                      : 'Date not set'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="admin-overview-grid">
        <SectionCard title="Quick actions" description="Common administrative workflows">
          <div className="admin-quick-grid">
            <QuickActionCard title="Manage users" description="Review platform accounts" to="/admin/users" icon="users" />
            <QuickActionCard title="Create event" description="Set up a hackathon" to="/admin/events" icon="plus" />
            <QuickActionCard title="View registrations" description="Review teams and entries" to="/admin/registrations" icon="clipboard" />
            <QuickActionCard title="Manage faculty" description="Review faculty accounts" to="/admin/faculty" icon="faculty" />
          </div>
        </SectionCard>

        <SectionCard title="Platform status" description="Current integration status">
          <div className="admin-status-row">
            <span className="admin-status-dot" aria-hidden="true" />
            <div className="grid gap-1">
              <strong>{teamStats ? `${teamStats.activeTeams ?? 0} active teams` : 'Team metrics not available yet'}</strong>
              <p>
                {registrationStats
                  ? `${registrationStats.total ?? 0} registrations recorded`
                  : 'Registration metrics not available yet'}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  )
}
