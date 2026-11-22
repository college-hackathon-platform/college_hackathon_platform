export default function AnalyticsFilterBar({
  startDate,
  endDate,
  interval,
  eventId,
  events,
  onStartDateChange,
  onEndDateChange,
  onIntervalChange,
  onEventChange,
  onClear,
}) {
  return (
    <section className="analytics-filter-bar" aria-label="Analytics filters">
      <label htmlFor="analytics-start-date">
        <span>Start date</span>
        <input
          id="analytics-start-date"
          type="date"
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
      </label>
      <label htmlFor="analytics-end-date">
        <span>End date</span>
        <input
          id="analytics-end-date"
          type="date"
          value={endDate}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
      </label>
      <label htmlFor="analytics-event">
        <span>Event</span>
        <select
          id="analytics-event"
          value={eventId}
          onChange={(event) => onEventChange(event.target.value)}
        >
          <option value="">All events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </label>
      <label htmlFor="analytics-interval">
        <span>Interval</span>
        <select
          id="analytics-interval"
          value={interval}
          onChange={(event) => onIntervalChange(event.target.value)}
        >
          <option value="DAY">Daily</option>
          <option value="WEEK">Weekly</option>
          <option value="MONTH">Monthly</option>
        </select>
      </label>
      <button type="button" className="analytics-clear-button" onClick={onClear}>
        Clear filters
      </button>
    </section>
  )
}
