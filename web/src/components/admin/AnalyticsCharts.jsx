import EmptyState from './EmptyState'

const seriesConfig = [
  { key: 'users', label: 'Users', color: '#315ee8' },
  { key: 'events', label: 'Events', color: '#18a06a' },
  { key: 'teams', label: 'Teams', color: '#b26a00' },
  { key: 'registrations', label: 'Registrations', color: '#9a4eb2' },
]

export function PlatformGrowthChart({ data }) {
  if (!data.length) {
    return <EmptyState icon="chart" title="No platform activity" description="There are no records in the selected reporting range." />
  }

  const width = 700
  const height = 280
  const left = 52
  const right = 16
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(1, ...data.flatMap((row) => seriesConfig.map((series) => Number(row[series.key] || 0))))
  const x = (index) => data.length === 1
    ? left + chartWidth / 2
    : left + (index / (data.length - 1)) * chartWidth
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Platform activity over time">
        {[0, 1, 2, 3, 4].map((step) => {
          const gridY = top + (step / 4) * chartHeight
          const gridValue = Math.round(maxValue - (step / 4) * maxValue)
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="analytics-chart-grid" />
              <text x={left - 8} y={gridY + 4} textAnchor="end" className="analytics-chart-label">{gridValue}</text>
            </g>
          )
        })}
        {seriesConfig.map((series) => {
          const points = data.map((row, index) => `${x(index)},${y(Number(row[series.key] || 0))}`).join(' ')
          return (
            <g key={series.key}>
              <polyline points={points} fill="none" stroke={series.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {data.map((row, index) => (
                <circle
                  key={`${series.key}-${row.period}`}
                  cx={x(index)}
                  cy={y(Number(row[series.key] || 0))}
                  r="4"
                  fill="#fff"
                  stroke={series.color}
                  strokeWidth="2"
                >
                  <title>{`${series.label}: ${row[series.key] || 0} on ${row.period}`}</title>
                </circle>
              ))}
            </g>
          )
        })}
        {data.map((row, index) => (
          index === 0 || index === data.length - 1 || data.length <= 8 || index % Math.ceil(data.length / 6) === 0
            ? <text key={row.period} x={x(index)} y={height - 12} textAnchor="middle" className="analytics-chart-label">{row.period.slice(5)}</text>
            : null
        ))}
      </svg>
      <div className="analytics-chart-legend">
        {seriesConfig.map((series) => (
          <span key={series.key}><i style={{ background: series.color }} />{series.label}</span>
        ))}
      </div>
    </div>
  )
}

export function UserGrowthChart({ data }) {
  if (!data.length) {
    return <EmptyState icon="users" title="No user acquisition activity" description="No accounts were created in the selected reporting range." />
  }

  const series = [
    { key: 'users', label: 'All users', color: '#315ee8' },
    { key: 'students', label: 'Students', color: '#18a06a' },
    { key: 'faculty', label: 'Faculty', color: '#b26a00' },
    { key: 'administrators', label: 'Administrators', color: '#9a4eb2' },
  ]
  const width = 700
  const height = 280
  const left = 52
  const right = 16
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(1, ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0))))
  const x = (index) => data.length === 1 ? left + chartWidth / 2 : left + (index / (data.length - 1)) * chartWidth
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="User registration trend">
        {[0, 1, 2, 3, 4].map((step) => {
          const gridY = top + (step / 4) * chartHeight
          const gridValue = Math.round(maxValue - (step / 4) * maxValue)
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="analytics-chart-grid" />
              <text x={left - 8} y={gridY + 4} textAnchor="end" className="analytics-chart-label">{gridValue}</text>
            </g>
          )
        })}
        {series.map((item) => (
          <g key={item.key}>
            <polyline
              points={data.map((row, index) => `${x(index)},${y(Number(row[item.key] || 0))}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((row, index) => (
              <circle key={`${item.key}-${row.period}`} cx={x(index)} cy={y(Number(row[item.key] || 0))} r="4" fill="#fff" stroke={item.color} strokeWidth="2">
                <title>{`${item.label}: ${row[item.key] || 0} on ${row.period}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((row, index) => (
          index === 0 || index === data.length - 1 || data.length <= 8 || index % Math.ceil(data.length / 6) === 0
            ? <text key={row.period} x={x(index)} y={height - 12} textAnchor="middle" className="analytics-chart-label">{row.period.slice(5)}</text>
            : null
        ))}
      </svg>
      <div className="analytics-chart-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  )
}

export function EventCreationChart({ data }) {
  if (!data.length) {
    return <EmptyState icon="calendar" title="No event creation activity" description="No events were created in the selected reporting range." />
  }

  const series = [
    { key: 'events', label: 'All events', color: '#315ee8' },
    { key: 'published', label: 'Published', color: '#18a06a' },
    { key: 'completed', label: 'Completed', color: '#9a4eb2' },
    { key: 'cancelled', label: 'Cancelled', color: '#d14d57' },
  ]
  const width = 700
  const height = 280
  const left = 52
  const right = 16
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(1, ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0))))
  const x = (index) => data.length === 1 ? left + chartWidth / 2 : left + (index / (data.length - 1)) * chartWidth
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Event creation trend">
        {[0, 1, 2, 3, 4].map((step) => {
          const gridY = top + (step / 4) * chartHeight
          const gridValue = Math.round(maxValue - (step / 4) * maxValue)
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="analytics-chart-grid" />
              <text x={left - 8} y={gridY + 4} textAnchor="end" className="analytics-chart-label">{gridValue}</text>
            </g>
          )
        })}
        {series.map((item) => (
          <g key={item.key}>
            <polyline
              points={data.map((row, index) => `${x(index)},${y(Number(row[item.key] || 0))}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((row, index) => (
              <circle key={`${item.key}-${row.period}`} cx={x(index)} cy={y(Number(row[item.key] || 0))} r="4" fill="#fff" stroke={item.color} strokeWidth="2">
                <title>{`${item.label}: ${row[item.key] || 0} on ${row.period}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((row, index) => (
          index === 0 || index === data.length - 1 || data.length <= 8 || index % Math.ceil(data.length / 6) === 0
            ? <text key={row.period} x={x(index)} y={height - 12} textAnchor="middle" className="analytics-chart-label">{row.period.slice(5)}</text>
            : null
        ))}
      </svg>
      <div className="analytics-chart-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  )
}

export function RegistrationTrendChart({ data }) {
  if (!data.length) {
    return <EmptyState icon="clipboard" title="No registration activity" description="No registrations were created in the selected reporting range." />
  }

  const series = [
    { key: 'registrations', label: 'All registrations', color: '#315ee8' },
    { key: 'confirmed', label: 'Confirmed', color: '#18a06a' },
    { key: 'pending', label: 'Pending', color: '#b26a00' },
  ]
  const width = 700
  const height = 280
  const left = 52
  const right = 16
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(1, ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0))))
  const x = (index) => data.length === 1 ? left + chartWidth / 2 : left + (index / (data.length - 1)) * chartWidth
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Registration activity trend">
        {[0, 1, 2, 3, 4].map((step) => {
          const gridY = top + (step / 4) * chartHeight
          const gridValue = Math.round(maxValue - (step / 4) * maxValue)
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="analytics-chart-grid" />
              <text x={left - 8} y={gridY + 4} textAnchor="end" className="analytics-chart-label">{gridValue}</text>
            </g>
          )
        })}
        {series.map((item) => (
          <g key={item.key}>
            <polyline
              points={data.map((row, index) => `${x(index)},${y(Number(row[item.key] || 0))}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((row, index) => (
              <circle key={`${item.key}-${row.period}`} cx={x(index)} cy={y(Number(row[item.key] || 0))} r="4" fill="#fff" stroke={item.color} strokeWidth="2">
                <title>{`${item.label}: ${row[item.key] || 0} on ${row.period}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((row, index) => (
          index === 0 || index === data.length - 1 || data.length <= 8 || index % Math.ceil(data.length / 6) === 0
            ? <text key={row.period} x={x(index)} y={height - 12} textAnchor="middle" className="analytics-chart-label">{row.period.slice(5)}</text>
            : null
        ))}
      </svg>
      <div className="analytics-chart-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  )
}

export function PopularEventsTable({ data }) {
  if (!data.length) {
    return <EmptyState icon="calendar" title="No popular events" description="No confirmed event registration data matches the selected scope." />
  }

  return (
    <div className="analytics-popularity-table" role="region" aria-label="Popular events ranking" tabIndex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Event</th>
            <th scope="col">Status</th>
            <th scope="col">Confirmed</th>
            <th scope="col">Teams</th>
            <th scope="col">Students</th>
          </tr>
        </thead>
        <tbody>
          {data.map((event, index) => (
            <tr key={event.eventId}>
              <td>{index + 1}</td>
              <td><strong>{event.title}</strong></td>
              <td><span className={`analytics-status-badge analytics-status-${event.status.toLowerCase()}`}>{event.status.replaceAll('_', ' ')}</span></td>
              <td>{event.confirmedRegistrations}</td>
              <td>{event.participatingTeams}</td>
              <td>{event.participatingStudents}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DonutDistribution({ title, data, description }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (!total) {
    return (
      <div className="analytics-donut-empty">
        <EmptyState icon="users" title={`No ${title.toLowerCase()} data`} description={description || 'No records match the selected scope.'} />
      </div>
    )
  }

  const palette = ['#315ee8', '#18a06a', '#b26a00', '#9a4eb2', '#d14d57', '#68758a']
  const segments = data
    .filter((item) => item.count > 0)
    .reduce((result, item, index) => {
      const previousEnd = result.length
        ? result[result.length - 1].end
        : 0
      const end = previousEnd + (item.count / total) * 360
      result.push({
        segment: `${palette[index % palette.length]} ${previousEnd}deg ${end}deg`,
        end,
      })
      return result
    }, [])
    .map((entry) => entry.segment)

  return (
    <div className="analytics-donut-layout">
      <div className="analytics-donut" style={{ background: `conic-gradient(${segments.join(', ')})` }} aria-label={`${title}: ${total} total`}>
        <div><strong>{total}</strong><span>Total</span></div>
      </div>
      <dl className="analytics-distribution-list">
        {data.map((item, index) => (
          <div key={item.category}>
            <dt><i style={{ background: palette[index % palette.length] }} />{item.category.replaceAll('_', ' ')}</dt>
            <dd><strong>{item.count}</strong><span>{item.percentage}%</span></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function StatusDistribution({ data, title, description }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (!total) {
    return <EmptyState icon="chart" title={`No ${title.toLowerCase()} data`} description={description || 'No records match the selected scope.'} />
  }

  const palette = ['#315ee8', '#18a06a', '#b26a00', '#9a4eb2', '#d14d57', '#68758a']
  return (
    <div className="analytics-status-bars">
      {data.filter((item) => item.count > 0).map((item, index) => (
        <div key={item.category} className="analytics-status-row">
          <div>
            <span>{item.category.replaceAll('_', ' ')}</span>
            <strong>{item.count} ({item.percentage}%)</strong>
          </div>
          <div className="analytics-status-track">
            <span style={{ width: `${item.percentage}%`, background: palette[index % palette.length] }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TeamFormationChart({ data }) {
  if (!data.length) {
    return <EmptyState icon="users" title="No team formation activity" description="No teams were created in the selected reporting range." />
  }

  const series = [
    { key: 'teams', label: 'All teams', color: '#315ee8' },
    { key: 'active', label: 'Active', color: '#18a06a' },
    { key: 'archived', label: 'Archived', color: '#b26a00' },
    { key: 'disbanded', label: 'Disbanded', color: '#d14d57' },
  ]
  const width = 700
  const height = 280
  const left = 52
  const right = 16
  const top = 18
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(1, ...data.flatMap((row) => series.map((item) => Number(row[item.key] || 0))))
  const x = (index) => data.length === 1 ? left + chartWidth / 2 : left + (index / (data.length - 1)) * chartWidth
  const y = (value) => top + chartHeight - (value / maxValue) * chartHeight

  return (
    <div className="analytics-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Team formation trend">
        {[0, 1, 2, 3, 4].map((step) => {
          const gridY = top + (step / 4) * chartHeight
          const gridValue = Math.round(maxValue - (step / 4) * maxValue)
          return (
            <g key={step}>
              <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="analytics-chart-grid" />
              <text x={left - 8} y={gridY + 4} textAnchor="end" className="analytics-chart-label">{gridValue}</text>
            </g>
          )
        })}
        {series.map((item) => (
          <g key={item.key}>
            <polyline
              points={data.map((row, index) => `${x(index)},${y(Number(row[item.key] || 0))}`).join(' ')}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data.map((row, index) => (
              <circle key={`${item.key}-${row.period}`} cx={x(index)} cy={y(Number(row[item.key] || 0))} r="4" fill="#fff" stroke={item.color} strokeWidth="2">
                <title>{`${item.label}: ${row[item.key] || 0} on ${row.period}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {data.map((row, index) => (
          index === 0 || index === data.length - 1 || data.length <= 8 || index % Math.ceil(data.length / 6) === 0
            ? <text key={row.period} x={x(index)} y={height - 12} textAnchor="middle" className="analytics-chart-label">{row.period.slice(5)}</text>
            : null
        ))}
      </svg>
      <div className="analytics-chart-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </div>
  )
}

export function TeamSizeBarChart({ data }) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return <EmptyState icon="users" title="No team size data" description="No teams match the selected scope." />
  }

  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const color = '#315ee8'

  return (
    <div className="analytics-bar-chart">
      {data.map((d) => (
        <div key={d.bucket} className="analytics-bar-row">
          <span className="analytics-bar-label">{d.bucket} member{d.bucket === '1' ? '' : 's'}</span>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{ width: `${(d.count / maxCount) * 100}%`, background: color }}
              role="img"
              aria-label={`${d.bucket} members: ${d.count} teams`}
            />
          </div>
          <span className="analytics-bar-value">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

export function EventWiseTable({ data }) {
  if (!data.length) {
    return <EmptyState icon="calendar" title="No event data" description="No events match the selected scope." />
  }

  return (
    <div className="analytics-popularity-table" role="region" aria-label="Event-wise team and registration breakdown" tabIndex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Status</th>
            <th scope="col">Teams</th>
            <th scope="col">Registrations</th>
            <th scope="col">Confirmed</th>
            <th scope="col">Pending</th>
            <th scope="col">Students</th>
            <th scope="col">Confirm %</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.eventId}>
              <td><strong>{row.title}</strong></td>
              <td><span className={`analytics-status-badge analytics-status-${row.eventStatus.toLowerCase()}`}>{row.eventStatus.replaceAll('_', ' ')}</span></td>
              <td>{row.totalTeams}</td>
              <td>{row.totalRegistrations}</td>
              <td>{row.confirmedRegistrations}</td>
              <td>{row.pendingRegistrations}</td>
              <td>{row.participatingStudents}</td>
              <td>{row.confirmationRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PopularTeamsTable({ data }) {
  if (!data.length) {
    return <EmptyState icon="users" title="No team data" description="No teams match the selected scope." />
  }

  return (
    <div className="analytics-popularity-table" role="region" aria-label="Popular teams ranking" tabIndex="0">
      <table>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Team</th>
            <th scope="col">Event</th>
            <th scope="col">Status</th>
            <th scope="col">Confirmed</th>
            <th scope="col">Members</th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => (
            <tr key={team.teamId}>
              <td>{index + 1}</td>
              <td><strong>{team.name}</strong></td>
              <td><span title={team.eventTitle}>{team.eventTitle}</span></td>
              <td><span className={`analytics-status-badge analytics-status-${team.status.toLowerCase()}`}>{team.status}</span></td>
              <td>{team.confirmedRegistrations}</td>
              <td>{team.activeMembers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
