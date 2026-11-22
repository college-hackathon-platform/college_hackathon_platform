function getUtcDateOnlyBounds(startDate, endDate) {
  let start = null;
  let endExclusive = null;

  if (startDate) {
    start = new Date(`${startDate}T00:00:00.000Z`);
  }

  if (endDate) {
    const end = new Date(`${endDate}T00:00:00.000Z`);
    endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, endExclusive };
}

function buildCreatedAtFilter(startDate, endDate) {
  const { start, endExclusive } = getUtcDateOnlyBounds(startDate, endDate);
  const filter = {};
  if (start) filter.gte = start;
  if (endExclusive) filter.lt = endExclusive;
  return Object.keys(filter).length ? filter : undefined;
}

function normalizeAnalyticsFilters(payload) {
  return {
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    eventId: payload.eventId || null,
    userRole: payload.userRole || null,
    status: payload.status || null,
    interval: payload.interval,
  };
}

module.exports = { getUtcDateOnlyBounds, buildCreatedAtFilter, normalizeAnalyticsFilters };
