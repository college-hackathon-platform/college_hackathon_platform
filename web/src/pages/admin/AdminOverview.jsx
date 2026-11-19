import { Link } from 'react-router-dom'
import EmptyState from '../../components/admin/EmptyState'
import PageHeader from '../../components/admin/PageHeader'
import QuickActionCard from '../../components/admin/QuickActionCard'
import SectionCard from '../../components/admin/SectionCard'
import StatCard from '../../components/admin/StatCard'

const unavailableStats = [
  { label: 'Total Users', value: 'Unavailable', description: 'Data endpoint not connected', icon: 'users' },
  { label: 'Active Hackathons', value: 'Unavailable', description: 'Data endpoint not connected', icon: 'calendar' },
  { label: 'Registrations', value: 'Unavailable', description: 'Data endpoint not connected', icon: 'clipboard' },
  { label: 'Faculty Accounts', value: 'Unavailable', description: 'Data endpoint not connected', icon: 'faculty' },
]

export default function AdminOverview() {
  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Administrative summary and shortcuts."
        actions={<Link className="admin-primary-button" to="/admin/events"><span className="admin-button-plus">+</span>Create event</Link>}
      />

      <div className="admin-stat-grid" aria-label="Platform statistics">
        {unavailableStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="admin-overview-grid">
        <SectionCard title="Recent activity" description="Latest platform actions">
          <EmptyState
            icon="clipboard"
            title="No recent activity available"
            description="Activity data has not been connected."
          />
        </SectionCard>

        <SectionCard title="Upcoming events" description="Scheduled hackathons" action={<Link className="admin-text-link" to="/admin/events">View events</Link>}>
          <EmptyState
            icon="calendar"
            title="No upcoming events"
            description="Event data has not been connected."
            action={<Link className="admin-text-link" to="/admin/events">Open Events</Link>}
          />
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
            <div>
              <strong>Status data unavailable</strong>
              <p>Health information is not connected to this dashboard.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  )
}
