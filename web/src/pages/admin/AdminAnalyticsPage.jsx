import { useCallback, useEffect, useState } from 'react'
import AnalyticsChartContainer from '../../components/admin/AnalyticsChartContainer'
import AnalyticsFilterBar from '../../components/admin/AnalyticsFilterBar'
import {
  DonutDistribution,
  PlatformGrowthChart,
  StatusDistribution,
  UserGrowthChart,
} from '../../components/admin/AnalyticsCharts'
import PageHeader from '../../components/admin/PageHeader'
import SectionCard from '../../components/admin/SectionCard'
import StatCard from '../../components/admin/StatCard'
import { getAdminEvents } from '../../services/adminEventsService'
import { getAnalyticsMetadata, getAnalyticsOverview, getUserAnalytics } from '../../services/analyticsService'
import { getApiErrorMessage } from '../../services/api'

export default function AdminAnalyticsPage() {
  const [metadata, setMetadata] = useState(null)
  const [overview, setOverview] = useState(null)
  const [userAnalytics, setUserAnalytics] = useState(null)
  const [events, setEvents] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventId, setEventId] = useState('')
  const [interval, setInterval] = useState('MONTH')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = {
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
      ...(eventId ? { eventId } : {}),
      interval,
    }
    const [metadataResult, overviewResult, userResult, eventsResult] = await Promise.allSettled([
      getAnalyticsMetadata(params),
      getAnalyticsOverview(params),
      getUserAnalytics(params),
      getAdminEvents({ page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
    ])

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
          {Array.from({ length: 10 }, (_, index) => (
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
            <a href="#events"><strong>Events</strong><span>Lifecycle status</span></a>
            <a href="#registrations"><strong>Teams & registrations</strong><span>Status and team size</span></a>
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
