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
