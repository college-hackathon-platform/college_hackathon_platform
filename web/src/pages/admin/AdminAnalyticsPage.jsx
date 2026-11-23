import { useCallback, useEffect, useRef, useState } from 'react'
import AnalyticsChartContainer from '../../components/admin/AnalyticsChartContainer'
import AnalyticsFilterBar from '../../components/admin/AnalyticsFilterBar'
import {
  DonutDistribution,
  EventCreationChart,
  EventWiseTable,
  PlatformGrowthChart,
  PopularEventsTable,
  PopularTeamsTable,
  RegistrationTrendChart,
  StatusDistribution,
  TeamFormationChart,
  TeamSizeBarChart,
  UserGrowthChart,
} from '../../components/admin/AnalyticsCharts'
import PageHeader from '../../components/admin/PageHeader'
import SectionCard from '../../components/admin/SectionCard'
import StatCard from '../../components/admin/StatCard'
import ReportsExportSection from '../../components/admin/ReportsExportSection'
import { getAdminEvents } from '../../services/adminEventsService'
import { getAnalyticsMetadata, getAnalyticsOverview, getEventAnalytics, getTeamRegistrationAnalytics, getUserAnalytics } from '../../services/analyticsService'
import { getApiErrorMessage } from '../../services/api'

function formatAnalyticsDate(value) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not set'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminAnalyticsPage() {
  const [metadata, setMetadata] = useState(null)
  const [overview, setOverview] = useState(null)
  const [userAnalytics, setUserAnalytics] = useState(null)
  const [eventAnalytics, setEventAnalytics] = useState(null)
  const [teamRegAnalytics, setTeamRegAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventId, setEventId] = useState('')
  const [interval, setInterval] = useState('MONTH')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadRequestRef = useRef(0)

  const loadAnalytics = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setError('')

    const params = {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(eventId ? { eventId } : {}),
      interval,
    }
    const [metadataResult, overviewResult, userResult, eventResult, teamRegResult, eventsResult] = await Promise.allSettled([
      getAnalyticsMetadata(params),
      getAnalyticsOverview(params),
      getUserAnalytics(params),
      getEventAnalytics(params),
      getTeamRegistrationAnalytics(params),
      getAdminEvents({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
    ])

    if (requestId !== loadRequestRef.current) return

    const failures = []
    if (metadataResult.status === 'fulfilled') {
      setMetadata(metadataResult.value.data?.data || null)
    } else {
      setMetadata(null)
      failures.push(getApiErrorMessage(metadataResult.reason, 'Unable to load analytics metadata.'))
    }
    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value.data?.data || null)
    } else {
      setOverview(null)
      failures.push(getApiErrorMessage(overviewResult.reason, 'Unable to load analytics overview.'))
    }
    if (userResult.status === 'fulfilled') {
      setUserAnalytics(userResult.value.data?.data || null)
    } else {
      setUserAnalytics(null)
      failures.push(getApiErrorMessage(userResult.reason, 'Unable to load user analytics.'))
    }
    if (eventResult.status === 'fulfilled') {
      setEventAnalytics(eventResult.value.data?.data || null)
    } else {
      setEventAnalytics(null)
      failures.push(getApiErrorMessage(eventResult.reason, 'Unable to load event analytics.'))
    }
    if (teamRegResult.status === 'fulfilled') {
      setTeamRegAnalytics(teamRegResult.value.data?.data || null)
    } else {
      setTeamRegAnalytics(null)
      failures.push(getApiErrorMessage(teamRegResult.reason, 'Unable to load team and registration analytics.'))
    }
    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data?.data?.events || [])
    } else {
      setEvents([])
      failures.push(getApiErrorMessage(eventsResult.reason, 'Unable to load event filters.'))
    }

    setError(failures.join(' '))
    setLoading(false)
  }, [startDate, endDate, eventId, interval])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAnalytics()
  }, [loadAnalytics])

  function clearFilters() {
    setStartDate('')
    setEndDate('')
    setEventId('')
    setInterval('MONTH')
  }

  const kpis = overview?.kpis
  const kpiCards = kpis ? [
    { label: 'Total Users', value: kpis.totalUsers.value, icon: 'users', scope: kpis.totalUsers.scope, comparison: kpis.totalUsers.changePercentage },
    { label: 'Students', value: kpis.totalStudents.value, icon: 'users', scope: kpis.totalStudents.scope, comparison: kpis.totalStudents.changePercentage },
    { label: 'Faculty', value: kpis.totalFaculty.value, icon: 'faculty', scope: kpis.totalFaculty.scope, comparison: kpis.totalFaculty.changePercentage },
    { label: 'Administrators', value: kpis.totalAdmins.value, icon: 'users', scope: kpis.totalAdmins.scope, comparison: kpis.totalAdmins.changePercentage },
    { label: 'Total Events', value: kpis.totalEvents.value, icon: 'calendar', scope: kpis.totalEvents.scope, comparison: kpis.totalEvents.changePercentage },
    { label: 'Active Events', value: kpis.activeEvents.value, icon: 'award', scope: kpis.activeEvents.scope, comparison: kpis.activeEvents.changePercentage },
    { label: 'Total Teams', value: kpis.totalTeams.value, icon: 'clipboard', scope: kpis.totalTeams.scope, comparison: kpis.totalTeams.changePercentage },
    { label: 'Total Registrations', value: kpis.totalRegistrations.value, icon: 'clipboard', scope: kpis.totalRegistrations.scope, comparison: kpis.totalRegistrations.changePercentage },
    { label: 'Confirmed', value: kpis.confirmedRegistrations.value, icon: 'award', scope: kpis.confirmedRegistrations.scope, comparison: kpis.confirmedRegistrations.changePercentage },
    { label: 'Pending', value: kpis.pendingRegistrations.value, icon: 'clock', scope: kpis.pendingRegistrations.scope, comparison: kpis.pendingRegistrations.changePercentage },
  ] : []

  const eventSummary = eventAnalytics?.summary
  const eventKpiCards = eventSummary ? [
    { label: 'Total Events', value: eventSummary.totalEvents, icon: 'calendar', scope: eventSummary.scope },
    { label: 'Draft Events', value: eventSummary.draftEvents, icon: 'clipboard', scope: eventSummary.scope },
    { label: 'Published Events', value: eventSummary.publishedEvents, icon: 'award', scope: eventSummary.scope },
    { label: 'Active Events', value: eventSummary.activeEvents, icon: 'clock', scope: eventSummary.scope },
    { label: 'Completed Events', value: eventSummary.completedEvents, icon: 'award', scope: eventSummary.scope },
    { label: 'Cancelled Events', value: eventSummary.cancelledEvents, icon: 'calendar', scope: eventSummary.scope },
    { label: 'Total Registrations', value: eventSummary.totalRegistrations, icon: 'clipboard', scope: eventSummary.scope },
    { label: 'Confirmed Registrations', value: eventSummary.confirmedRegistrations, icon: 'award', scope: eventSummary.scope },
    { label: 'Pending Registrations', value: eventSummary.pendingRegistrations, icon: 'clock', scope: eventSummary.scope },
    { label: 'Participating Teams', value: eventSummary.participatingTeams, icon: 'clipboard', scope: eventSummary.scope },
    { label: 'Participating Students', value: eventSummary.participatingStudents, icon: 'users', scope: eventSummary.scope },
    { label: 'Avg. Registrations / Event', value: eventSummary.averageRegistrationsPerEvent, icon: 'chart', scope: eventSummary.scope },
  ] : []

  function comparisonLabel(card) {
    if (typeof card.comparison !== 'number') return card.scope === 'EVENT' ? 'Event scope' : 'Platform scope'
    const sign = card.comparison > 0 ? '+' : ''
    return `${sign}${card.comparison}% vs previous period`
  }

  return (
    <>
      <PageHeader
        title="Analytics Overview"
        description="A real-time administrative view of users, events, teams, and registrations."
      />

      <AnalyticsFilterBar
        startDate={startDate}
        endDate={endDate}
        interval={interval}
        eventId={eventId}
        events={events}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onIntervalChange={setInterval}
        onEventChange={setEventId}
        onClear={clearFilters}
      />

      {error && (
        <div className="analytics-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadAnalytics()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="analytics-loading analytics-loading-ten" aria-label="Loading analytics overview" aria-live="polite">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="analytics-skeleton" />
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="analytics-kpi-grid analytics-kpi-grid-ten" aria-label="Platform overview KPIs">
            {kpiCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                description={comparisonLabel(card)}
                icon={card.icon}
              />
            ))}
          </div>

          <div className="analytics-section-nav analytics-section-nav-four" aria-label="Analytics overview sections">
            <a className="is-active" href="#growth"><strong>Growth</strong><span>Platform activity</span></a>
            <a href="#users"><strong>Users</strong><span>Role distribution</span></a>
            <a href="#user-analytics"><strong>User Analytics</strong><span>Acquisition and participation</span></a>
            <a href="#event-analytics"><strong>Event Analytics</strong><span>Lifecycle and performance</span></a>
            <a href="#team-analytics"><strong>Team &amp; Registrations</strong><span>Formation and conversion</span></a>
            <a href="#events"><strong>Events</strong><span>Lifecycle status</span></a>
            <a href="#registrations"><strong>Teams &amp; registrations</strong><span>Status and team size</span></a>
            <a href="#reports"><strong>Reports &amp; Export</strong><span>Official exports</span></a>
          </div>

          <div id="growth" className="analytics-wide-card">
            <SectionCard title="Platform Activity Over Time" description={`UTC ${interval.toLowerCase()} aggregation; actual records only`}>
              <AnalyticsChartContainer title="Platform activity" description="New users, events, teams, and registrations">
                <PlatformGrowthChart data={overview.growth || []} />
              </AnalyticsChartContainer>
            </SectionCard>
          </div>

          <div className="analytics-distribution-grid">
            <div id="users">
              <SectionCard title="User Role Distribution" description="Role distribution across the selected date range">
                <AnalyticsChartContainer title="User role distribution">
                  <DonutDistribution
                    title="Users"
                    data={overview.distributions.userRoles}
                    description="No users match the selected reporting scope."
                  />
                </AnalyticsChartContainer>
              </SectionCard>
            </div>
            <div id="events">
              <SectionCard title="Event Status Distribution" description="Actual EventStatus lifecycle values">
                <AnalyticsChartContainer title="Event status distribution">
                  <StatusDistribution
                    title="Events"
                    data={overview.distributions.eventStatuses}
                    description="No events match the selected reporting scope."
                  />
                </AnalyticsChartContainer>
              </SectionCard>
            </div>
          </div>

          {userAnalytics && (
            <div id="user-analytics" className="analytics-user-section">
              <SectionCard title="User Analytics" description="All-time account totals, selected-period acquisition, and participation based on confirmed registrations">
                <div className="analytics-user-kpi-grid">
                  {[
                    ['Total Users', userAnalytics.summary.totalUsers],
                    ['New Users', userAnalytics.summary.newUsers],
                    ['Students', userAnalytics.summary.totalStudents],
                    ['New Students', userAnalytics.summary.newStudents],
                    ['Faculty', userAnalytics.summary.totalFaculty],
                    ['Administrators', userAnalytics.summary.totalAdmins],
                    ['Active Accounts', userAnalytics.summary.activeAccounts],
                    ['Suspended Accounts', userAnalytics.summary.suspendedAccounts],
                  ].map(([label, value]) => (
                    <StatCard key={label} label={label} value={value} description={label.startsWith('New') ? 'Selected period' : 'All-time platform account'} icon="users" />
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="User Registration Trend" description={`UTC ${interval.toLowerCase()} acquisition by actual account role`}>
                <AnalyticsChartContainer title="User acquisition" description="Database-derived account creation">
                  <UserGrowthChart data={userAnalytics.growth || []} />
                </AnalyticsChartContainer>
              </SectionCard>

              <div className="analytics-distribution-grid">
                <SectionCard title="Detailed Role Distribution" description="Percentages use the actual total user count">
                  <AnalyticsChartContainer title="Detailed user role distribution">
                    <DonutDistribution title="Users" data={userAnalytics.roles} description="No user accounts exist." />
                  </AnalyticsChartContainer>
                </SectionCard>
                <SectionCard title="Account Status Distribution" description="Actual AccountStatus values; no login activity is inferred">
                  <AnalyticsChartContainer title="Account status distribution">
                    <StatusDistribution title="Account statuses" data={userAnalytics.accountStatus} description="No account statuses match this scope." />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <SectionCard title="User Participation" description={userAnalytics.participation.definition}>
                <div className="analytics-team-overview">
                  <div className="analytics-team-kpis">
                    <div><span>Participating students</span><strong>{userAnalytics.participation.participatingStudents}</strong></div>
                    <div><span>Never participating</span><strong>{userAnalytics.participation.nonParticipatingStudents}</strong></div>
                    <div><span>Participation rate</span><strong>{userAnalytics.participation.participationRate}%</strong></div>
                    <div><span>Confirmed registrations</span><strong>{userAnalytics.participation.confirmedRegistrationCount}</strong></div>
                    <div><span>Average per participant</span><strong>{userAnalytics.participation.averageRegistrationsPerParticipatingStudent}</strong></div>
                  </div>
                  {userAnalytics.participation.mostParticipatingEvents.length ? (
                    <div className="analytics-team-events">
                      {userAnalytics.participation.mostParticipatingEvents.map((event) => (
                        <div key={event.eventId}>
                          <span title={event.eventTitle}>{event.eventTitle}</span>
                          <strong>{event.participatingStudents} students</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="analytics-team-empty">No confirmed student participation matches the selected scope.</div>
                  )}
                  <p className="analytics-reporting-note">{userAnalytics.participation.engagementSource}</p>
                </div>
              </SectionCard>

              <SectionCard title="User Acquisition Comparison" description="Equivalent-duration previous-period counts">
                <div className="analytics-acquisition-grid">
                  {[
                    ['New users', userAnalytics.acquisition.newUsers],
                    ['New students', userAnalytics.acquisition.newStudents],
                    ['New faculty', userAnalytics.acquisition.newFaculty],
                    ['New administrators', userAnalytics.acquisition.newAdmins],
                  ].map(([label, item]) => (
                    <div key={label} className="analytics-acquisition-card">
                      <span>{label}</span>
                      <strong>{item.value}</strong>
                      <small>
                        {typeof item.changePercentage === 'number'
                          ? `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}%`
                          : item.previousValue === 0
                            ? 'N/A: previous period was zero'
                            : 'N/A: complete range required'}
                      </small>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {eventAnalytics && (
            <div id="event-analytics" className="analytics-event-section">
              <SectionCard
                title="Event Analytics"
                description={eventSummary?.scope === 'EVENT'
                  ? 'Selected-event registration and participation data with event-specific lifecycle totals'
                  : 'Platform-wide event lifecycle, creation, registration, and participation analytics'}
              >
                <div className="analytics-event-kpi-grid">
                  {eventKpiCards.map((card) => (
                    <StatCard
                      key={card.label}
                      label={card.label}
                      value={card.value}
                      description={card.scope === 'EVENT' ? 'Selected event scope' : 'Platform scope'}
                      icon={card.icon}
                    />
                  ))}
                </div>
                {eventAnalytics.comparisons && (
                  <div className="analytics-acquisition-grid analytics-event-comparisons">
                    {[
                      ['Events created', eventAnalytics.comparisons.eventsCreated],
                      ['Registrations received', eventAnalytics.comparisons.registrationsReceived],
                      ['Confirmed registrations', eventAnalytics.comparisons.confirmedRegistrations],
                      ['Participating teams', eventAnalytics.comparisons.participatingTeams],
                      ['Participating students', eventAnalytics.comparisons.participatingStudents],
                    ].map(([label, item]) => (
                      <div key={label} className="analytics-acquisition-card">
                        <span>{label}</span>
                        <strong>{item.previousValue === null || item.previousValue === undefined ? 'N/A' : item.previousValue}</strong>
                        <small>
                          {typeof item.changePercentage === 'number'
                            ? `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}% vs previous period`
                            : 'Unavailable: complete date range required'}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <div className="analytics-distribution-grid">
                <SectionCard title="Event Lifecycle" description="Actual EventStatus values; lifecycle is not inferred from event dates">
                  <AnalyticsChartContainer title="Event status distribution">
                    <StatusDistribution
                      title="Events"
                      data={eventAnalytics.lifecycle}
                      description="No events match the selected reporting scope."
                    />
                  </AnalyticsChartContainer>
                </SectionCard>
                <SectionCard title="Registration Status" description="Current status distribution; historical status transitions are not reconstructed">
                  <AnalyticsChartContainer title="Registration status distribution">
                    <StatusDistribution
                      title="Registrations"
                      data={eventAnalytics.registrationStatus}
                      description="No registrations match the selected reporting scope."
                    />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Event Creation Trend" description={`UTC ${interval.toLowerCase()} aggregation of actual Event.createdAt values`}>
                  <AnalyticsChartContainer title="Events created" description="Event creation time, not event start time">
                    <EventCreationChart data={eventAnalytics.eventGrowth || []} />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Registration Activity" description={`UTC ${interval.toLowerCase()} registration creation trend from actual EventRegistration.createdAt values`}>
                  <AnalyticsChartContainer title="Registration activity" description="Current-status series are grouped from registration creation records">
                    <RegistrationTrendChart data={eventAnalytics.registrationTrends || []} />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-event-two-grid">
                <SectionCard title="Popular Events" description="Ranked by confirmed registrations, then participating students, teams, and title">
                  <PopularEventsTable data={eventAnalytics.popularity || []} />
                </SectionCard>
                <SectionCard title="Participation & Conversion" description={eventAnalytics.participation.definition}>
                  <div className="analytics-event-participation">
                    <div className="analytics-team-kpis">
                      <div><span>Participating teams</span><strong>{eventAnalytics.participation.participatingTeams}</strong></div>
                      <div><span>Participating students</span><strong>{eventAnalytics.participation.participatingStudents}</strong></div>
                      <div><span>Confirmed registrations</span><strong>{eventAnalytics.participation.confirmedRegistrations}</strong></div>
                      <div><span>Avg. students / team</span><strong>{eventAnalytics.participation.averageStudentsPerParticipatingTeam}</strong></div>
                      <div><span>Total registrations</span><strong>{eventAnalytics.conversion.totalRegistrations}</strong></div>
                      <div><span>Current confirmation rate</span><strong>{eventAnalytics.conversion.currentConfirmationRate}%</strong></div>
                    </div>
                    <p className="analytics-reporting-note">{eventAnalytics.conversion.definition}</p>
                  </div>
                </SectionCard>
              </div>

              {eventAnalytics.eventDetails && (
                <SectionCard title="Individual Event Performance" description="Selected event details, registration status, participation, assignments, and registration activity">
                  <div className="analytics-event-detail">
                    <div className="analytics-event-detail-info">
                      <div><span>Event</span><strong>{eventAnalytics.eventDetails.event.title}</strong></div>
                      <div><span>Status</span><strong>{eventAnalytics.eventDetails.event.status.replaceAll('_', ' ')}</strong></div>
                      <div><span>Mode</span><strong>{eventAnalytics.eventDetails.event.mode}</strong></div>
                      <div><span>Created</span><strong>{formatAnalyticsDate(eventAnalytics.eventDetails.event.createdAt)}</strong></div>
                      <div><span>Event dates</span><strong>{formatAnalyticsDate(eventAnalytics.eventDetails.event.startDate)} – {formatAnalyticsDate(eventAnalytics.eventDetails.event.endDate)}</strong></div>
                      <div><span>Registration dates</span><strong>{formatAnalyticsDate(eventAnalytics.eventDetails.event.registrationStartDate)} – {formatAnalyticsDate(eventAnalytics.eventDetails.event.registrationEndDate)}</strong></div>
                      <div><span>Registration capacity</span><strong>{eventAnalytics.eventDetails.event.registrationCapacity ?? 'Not set'}</strong></div>
                    </div>

                    <div className="analytics-team-kpis">
                      {[
                        ['Total registrations', eventAnalytics.eventDetails.registrationSummary.total],
                        ['Confirmed', eventAnalytics.eventDetails.registrationSummary.confirmed],
                        ['Pending', eventAnalytics.eventDetails.registrationSummary.pending],
                        ['Rejected', eventAnalytics.eventDetails.registrationSummary.rejected],
                        ['Cancelled', eventAnalytics.eventDetails.registrationSummary.cancelled],
                        ['Participating teams', eventAnalytics.eventDetails.participationSummary.participatingTeams],
                        ['Participating students', eventAnalytics.eventDetails.participationSummary.participatingStudents],
                        ['Avg. students / team', eventAnalytics.eventDetails.participationSummary.averageStudentsPerParticipatingTeam],
                        ['Faculty assignments', eventAnalytics.eventDetails.facultyAssignments],
                        ['Evaluator invitations', eventAnalytics.eventDetails.evaluatorInvitations.total],
                      ].map(([label, value]) => (
                        <div key={label}><span>{label}</span><strong>{value}</strong></div>
                      ))}
                    </div>

                    <div className="analytics-event-detail-charts">
                      <AnalyticsChartContainer title="Selected event registration trend" description="Actual registration creation by selected interval">
                        <RegistrationTrendChart data={eventAnalytics.eventDetails.registrationActivity.trend || []} />
                      </AnalyticsChartContainer>
                      <AnalyticsChartContainer title="Selected event registration status" description="Current status counts and percentages">
                        <StatusDistribution
                          title="Registrations"
                          data={eventAnalytics.eventDetails.registrationActivity.statusDistribution}
                          description="No registrations match this event and date scope."
                        />
                      </AnalyticsChartContainer>
                    </div>

                    <p className="analytics-reporting-note">
                      Evaluator invitations: {eventAnalytics.eventDetails.evaluatorInvitations.pending} pending,
                      {' '}{eventAnalytics.eventDetails.evaluatorInvitations.revoked} revoked,
                      {' '}{eventAnalytics.eventDetails.evaluatorInvitations.expired} expired,
                      {' '}{eventAnalytics.eventDetails.evaluatorInvitations.emailSent} email-sent.
                      Private tokens are not returned.
                    </p>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {teamRegAnalytics && (
            <div id="team-analytics" className="analytics-event-section">
              <SectionCard
                title="Team &amp; Registration Analytics"
                description={teamRegAnalytics.teamSummary?.scope === 'EVENT'
                  ? 'Selected-event team formation, registration status, participation, and conversion'
                  : 'Platform-wide team formation, registration status, participation, and conversion analytics'}
              >
                <div className="analytics-tr-kpi-grid">
                  {[
                    ['Total Teams', teamRegAnalytics.teamSummary.totalTeams, 'clipboard'],
                    ['Active Teams', teamRegAnalytics.teamSummary.activeTeams, 'award'],
                    ['Teams w/ Registration', teamRegAnalytics.teamSummary.teamsWithRegistration, 'clipboard'],
                    ['Teams w/o Registration', teamRegAnalytics.teamSummary.teamsWithoutRegistration, 'clock'],
                    ['Active Members', teamRegAnalytics.teamSummary.activeMemberCount, 'users'],
                    ['Avg. Members / Team', teamRegAnalytics.teamSummary.averageMembersPerTeam, 'chart'],
                    ['Total Registrations', teamRegAnalytics.registrationSummary.totalRegistrations, 'clipboard'],
                    ['Confirmed', teamRegAnalytics.registrationSummary.confirmedRegistrations, 'award'],
                    ['Pending', teamRegAnalytics.registrationSummary.pendingRegistrations, 'clock'],
                    ['Rejected', teamRegAnalytics.registrationSummary.rejectedRegistrations, 'calendar'],
                    ['Cancelled', teamRegAnalytics.registrationSummary.cancelledRegistrations, 'calendar'],
                    ['Confirmation Rate', `${teamRegAnalytics.conversion.currentConfirmationRate}%`, 'chart'],
                  ].map(([label, value, icon]) => (
                    <StatCard
                      key={label}
                      label={label}
                      value={value}
                      description={teamRegAnalytics.teamSummary.scope === 'EVENT' ? 'Selected event scope' : 'Platform scope'}
                      icon={icon}
                    />
                  ))}
                </div>

                <div className="analytics-acquisition-grid analytics-tr-comparisons">
                  {[
                    ['Total teams', teamRegAnalytics.comparisons.totalTeams],
                    ['Total registrations', teamRegAnalytics.comparisons.totalRegistrations],
                    ['Confirmed registrations', teamRegAnalytics.comparisons.confirmedRegistrations],
                    ['Confirmed teams', teamRegAnalytics.comparisons.confirmedTeams],
                    ['Participating students', teamRegAnalytics.comparisons.participatingStudents],
                  ].map(([label, item]) => (
                    <div key={label} className="analytics-acquisition-card">
                      <span>{label}</span>
                      <strong>{item.previousValue === null || item.previousValue === undefined ? 'N/A' : item.previousValue}</strong>
                      <small>
                        {typeof item.changePercentage === 'number'
                          ? `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}% vs previous period`
                          : 'Unavailable: complete date range required'}
                      </small>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="analytics-distribution-grid">
                <SectionCard title="Team Status Distribution" description="Actual TeamStatus values: ACTIVE, ARCHIVED, DISBANDED">
                  <AnalyticsChartContainer title="Team status distribution">
                    <StatusDistribution
                      title="Teams"
                      data={teamRegAnalytics.teamStatusDistribution}
                      description="No teams match the selected reporting scope."
                    />
                  </AnalyticsChartContainer>
                </SectionCard>
                <SectionCard title="Registration Status Distribution" description="Current status distribution; historical transitions are not reconstructed">
                  <AnalyticsChartContainer title="Registration status distribution">
                    <StatusDistribution
                      title="Registrations"
                      data={teamRegAnalytics.registrationStatusDistribution}
                      description="No registrations match the selected reporting scope."
                    />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Team Formation Trend" description={`UTC ${interval.toLowerCase()} aggregation of actual Team.createdAt values`}>
                  <AnalyticsChartContainer title="Team formation" description="Team creation time by status at time of query">
                    <TeamFormationChart data={teamRegAnalytics.teamGrowth || []} />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Registration Activity Trend" description={`UTC ${interval.toLowerCase()} registration creation trend from actual EventRegistration.createdAt values`}>
                  <AnalyticsChartContainer title="Registration activity" description="Current-status series grouped from registration creation records">
                    <RegistrationTrendChart data={teamRegAnalytics.registrationTrend || []} />
                  </AnalyticsChartContainer>
                </SectionCard>
              </div>

              <div className="analytics-event-two-grid">
                <SectionCard title="Team Size Distribution" description="Count of ACTIVE TeamMember records per team, bucketed by size">
                  <AnalyticsChartContainer title="Team size distribution" description="Teams grouped by active member count">
                    <TeamSizeBarChart data={teamRegAnalytics.teamSizeDistribution || []} />
                  </AnalyticsChartContainer>
                </SectionCard>
                <SectionCard title="Participation &amp; Conversion" description={teamRegAnalytics.participation.definition}>
                  <div className="analytics-event-participation">
                    <div className="analytics-team-kpis">
                      <div><span>Confirmed teams</span><strong>{teamRegAnalytics.participation.confirmedTeams}</strong></div>
                      <div><span>Participating students</span><strong>{teamRegAnalytics.participation.participatingStudents}</strong></div>
                      <div><span>Avg. members / confirmed team</span><strong>{teamRegAnalytics.participation.averageMembersPerConfirmedTeam}</strong></div>
                      <div><span>Total registrations</span><strong>{teamRegAnalytics.conversion.totalRegistrations}</strong></div>
                      <div><span>Confirmed registrations</span><strong>{teamRegAnalytics.conversion.confirmedRegistrations}</strong></div>
                      <div><span>Confirmation rate</span><strong>{teamRegAnalytics.conversion.currentConfirmationRate}%</strong></div>
                    </div>
                    <p className="analytics-reporting-note">{teamRegAnalytics.conversion.definition}</p>
                  </div>
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Event-wise Breakdown" description="Teams, registrations, confirmed registrations, participating students, and confirmation rate per event">
                  <EventWiseTable data={teamRegAnalytics.eventWise || []} />
                </SectionCard>
              </div>

              <div className="analytics-wide-card">
                <SectionCard title="Popular Teams" description="Ranked by confirmed registrations, then active member count, then team name">
                  <PopularTeamsTable data={teamRegAnalytics.popularTeams || []} />
                </SectionCard>
              </div>
            </div>
          )}

          <div id="registrations" className="analytics-team-grid">
            <SectionCard title="Registration Status Distribution" description="Actual EventRegistration status values">
              <AnalyticsChartContainer title="Registration status distribution">
                <StatusDistribution
                  title="Registrations"
                  data={overview.distributions.registrationStatuses}
                  description="No registrations match the selected reporting scope."
                />
              </AnalyticsChartContainer>
            </SectionCard>
            <SectionCard title="Team Overview" description="Current active membership divided by scoped teams">
              <div className="analytics-team-overview">
                <div className="analytics-team-kpis">
                  <div><span>Total teams</span><strong>{overview.teamOverview.totalTeams}</strong></div>
                  <div><span>Active members</span><strong>{overview.teamOverview.activeTeamMemberCount}</strong></div>
                  <div><span>Average team size</span><strong>{overview.teamOverview.averageTeamSize}</strong></div>
                </div>
                {overview.teamOverview.teamsByEvent.length ? (
                  <div className="analytics-team-events">
                    {overview.teamOverview.teamsByEvent.slice(0, 8).map((team) => (
                      <div key={team.eventId}>
                        <span title={team.eventTitle}>{team.eventTitle}</span>
                        <strong>{team.count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics-team-empty">No teams match the selected scope.</div>
                )}
              </div>
            </SectionCard>
          </div>

          <ReportsExportSection appliedFilters={{ startDate, endDate, eventId, interval }} events={events} />

          {metadata && (
            <p className="analytics-reporting-note">
              Reporting timezone: {metadata.timezone}. Date boundaries are UTC; end dates include the full selected calendar day.
            </p>
          )}
        </>
      ) : (
        <SectionCard title="Analytics overview unavailable" description="No analytics data could be loaded.">
          <div className="analytics-team-empty">Use Retry to request the overview again.</div>
        </SectionCard>
      )}
    </>
  )
}
