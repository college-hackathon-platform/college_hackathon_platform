import EmptyState from './EmptyState'

export default function AnalyticsChartContainer({ title, description, children }) {
  return (
    <section className="analytics-chart-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </header>
      <div className="analytics-chart-placeholder">
        {children || (
          <EmptyState
            icon="chart"
            title="Ready for analytics data"
            description="This visualization will be connected in a future analytics task."
          />
        )}
      </div>
    </section>
  )
}
