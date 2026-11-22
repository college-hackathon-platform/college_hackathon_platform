# Analytics Foundation Frontend Handoff

## Implemented route

`GET /api/v1/admin/analytics/metadata`

Authentication:

- Bearer access token required.
- The existing `ADMIN` role is required.

## Axios example

```js
api.get('/admin/analytics/metadata', {
  params: {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    interval: 'MONTH',
  },
})
```

## Query parameters

- `startDate`: optional `YYYY-MM-DD`
- `endDate`: optional `YYYY-MM-DD`
- `eventId`: optional valid UUID
- `userRole`: optional `ADMIN`, `FACULTY`, or `STUDENT`
- `status`: optional known platform status enum value
- `interval`: optional `DAY`, `WEEK`, or `MONTH`; default `MONTH`

Unknown fields are rejected. `startDate` cannot be later than `endDate`. Invalid event IDs return `422`; a valid but nonexistent event ID returns `404`.

## Date conventions

- Timezone: UTC.
- A start date is inclusive at `00:00:00.000Z`.
- An end date is inclusive for the whole selected calendar date and is represented internally as the exclusive start of the following day.
- There is no default date range. Omitting both dates means no date restriction.

## Successful response

```json
{
  "success": true,
  "message": "Analytics metadata retrieved successfully.",
  "data": {
    "timezone": "UTC",
    "dateRange": {
      "startDateFormat": "YYYY-MM-DD",
      "endDateFormat": "YYYY-MM-DD",
      "startBoundary": "Inclusive at 00:00:00.000Z",
      "endBoundary": "Inclusive for the selected calendar date; converted to exclusive end at 00:00:00.000Z on the following day"
    },
    "reportingIntervals": ["DAY", "WEEK", "MONTH"],
    "userRoles": ["ADMIN", "FACULTY", "STUDENT"],
    "accountStatuses": ["ACTIVE", "INACTIVE", "SUSPENDED"],
    "eventStatuses": ["DRAFT", "PUBLISHED", "REGISTRATION_CLOSED", "COMPLETED", "CANCELLED"],
    "teamStatuses": ["ACTIVE", "ARCHIVED", "DISBANDED"],
    "teamMemberStatuses": ["ACTIVE", "LEFT", "REMOVED"],
    "registrationStatuses": ["DRAFT", "SUBMITTED", "CONFIRMED", "REJECTED", "CANCELLED", "WAITLISTED"],
    "evaluatorInvitationStatuses": ["PENDING", "REVOKED", "EXPIRED"],
    "evaluatorEmailDeliveryStatuses": ["PENDING", "SENT", "FAILED"],
    "metricSources": {
      "users": "User.createdAt, User.role and User.status",
      "events": "Event.createdAt and Event.status",
      "teams": "Team.createdAt, Team.status and Team.eventId",
      "teamMembers": "TeamMember.teamId, TeamMember.status and TeamMember joinedAt/leftAt timestamps",
      "registrations": "EventRegistration.createdAt and EventRegistration.status"
    }
  },
  "filters": {
    "startDate": "2026-11-01",
    "endDate": "2026-11-30",
    "eventId": null,
    "userRole": null,
    "status": null,
    "interval": "MONTH"
  }
}
```

## Error behavior

Validation errors use status `422` and include `errors` keyed by field name:

```json
{
  "success": false,
  "message": "startDate cannot be later than endDate.",
  "errors": {
    "startDate": "startDate cannot be later than endDate."
  }
}
```

Authentication errors return `401`. Faculty or Student access returns `403`. A nonexistent event ID returns `404`.

## Future chart conventions

- Time series item: `{ "period": "YYYY-MM-DD", "value": 0 }`
- Distribution item: `{ "category": "CONFIRMED", "count": 0, "percentage": 0 }`

Percentages use the correct current distribution denominator. Zero denominators return `0`.

## Task 1 frontend foundation

The Admin navigation now routes to the Reports & Analytics page. The page provides:

- A UTC date-range foundation.
- Event, interval, and clear-filter controls.
- A six-section analytics navigation structure.
- KPI card and chart container placeholders.
- Metadata integration, loading skeleton, retryable error handling, and empty/error-safe content.
- Existing StatCard, SectionCard, PageHeader, and EmptyState components reused from the Admin UI.

No real chart, KPI aggregation, or report export is implemented by Task 1.

## Task 2 overview endpoint

`GET /api/v1/admin/analytics/overview`

The overview response contains:

- `kpis`: platform and event-scoped summary values with optional previous-period comparisons.
- `growth`: UTC bucketed series for users, events, teams, and registrations.
- `distributions.userRoles`: `STUDENT`, `FACULTY`, and `ADMIN` counts and percentages.
- `distributions.eventStatuses`: all actual event lifecycle enum values with counts and percentages.
- `distributions.registrationStatuses`: all actual registration enum values with counts and percentages.
- `teamOverview`: total teams, active TeamMember count, average team size, and teams grouped by event.

The frontend uses responsive SVG/CSS charts and never substitutes mock values.
