# Analytics Foundation Metric Definitions

All date calculations use UTC. Date-only filters include the entire selected start date and end date.

## User metrics

- Total users: `COUNT(User.id)`.
- Students: `COUNT(User.id) WHERE User.role = STUDENT`.
- Faculty: `COUNT(User.id) WHERE User.role = FACULTY`.
- Active users: `COUNT(User.id) WHERE User.status = ACTIVE`.
- Suspended/inactive users: the sum of records with `SUSPENDED` or `INACTIVE` status.
- New users: `User.createdAt` inside the selected UTC date range.
- Registrations over time: group `User.createdAt`, not authentication activity.

## Event metrics

- Total events: `COUNT(Event.id)`.
- Events by lifecycle: group by the actual `EventStatus` enum.
- Events created: `Event.createdAt` inside the selected UTC date range.
- Registrations per event: count `EventRegistration` rows for the event.
- Teams per event: count `Team` rows for the event.
- Capacity utilization: confirmed participation is represented by `CONFIRMED` registrations. Use submitted registrations only as pending demand. Utilization is `CONFIRMED registrations / Event.registrationCapacity`; zero or missing capacity must return zero utilization or `null`, not divide by zero.

## Team metrics

- Total teams: `COUNT(Team.id)`.
- Teams by event: group `Team.eventId`.
- Team-size distribution: count active `TeamMember` rows by team. A team without active members has size zero only if explicitly included.
- Team creation trends: group `Team.createdAt`.
- Team creation is distinct from team completion and registration submission.

## Registration metrics

- Total registrations: `COUNT(EventRegistration.id)`.
- Status distribution: group actual `RegistrationStatus` values.
- Confirmed registrations: status `CONFIRMED`.
- Pending registrations: status `SUBMITTED` or `WAITLISTED`, but these are not assumed confirmed participation.
- Cancelled registrations: status `CANCELLED`.
- Rejected registrations: status `REJECTED`.
- Registrations over time: use `EventRegistration.createdAt`; use `registeredAt` only where a future endpoint explicitly defines submitted-time behavior.

No team member, registration status, or capacity metric should assume a fourth evaluator role or infer confirmation from `SUBMITTED`.

## Task 2 overview interpretation

- Active events are `PUBLISHED` and `REGISTRATION_CLOSED`. Draft, completed, and cancelled events are not counted as active.
- Pending registrations are `SUBMITTED` and `WAITLISTED`. Draft, confirmed, rejected, and cancelled registrations remain separate statuses.
- Date-filtered KPIs are based on `createdAt` for users, events, teams, and registrations. Authentication activity is not used.
- An event filter scopes event, team, and registration analytics only. It does not restrict user-role or user-growth analytics.
- Previous-period comparisons are calculated only when both a start date and end date create a complete comparison period.
- Platform growth buckets contain database-derived counts. Buckets with no records are not invented; each series reports actual 0 values in returned periods where another series exists.
- Average team size is the number of `ACTIVE` TeamMember rows divided by the scoped Team count. It is not inferred from team leader records or team capacity limits.

## Task 3 user analytics interpretation

- All-time account totals use `User` records and are not restricted by the event filter.
- New account acquisition uses `User.createdAt` inside the selected UTC date range.
- Account status distribution uses `User.status`; login activity is not inferred from `User.updatedAt`.
- `User` has no verification field, so verified-account analytics are intentionally omitted.
- A participating student is a distinct `User` with role `STUDENT`, an `ACTIVE` TeamMember record, and a team registration with status `CONFIRMED`.
- Participation counts, confirmed registration counts, participation trends, and most-participating events are scoped by `eventId` and date filters when supplied.
- Non-participating students are total students minus distinct participating students in the selected scope.
- Average registrations per participating student uses distinct confirmed `EventRegistration` rows divided by distinct participating students.
- The platform has no last-login or login-history model; engagement is measured only through event participation.

## Task 4 event analytics interpretation

- Event lifecycle totals use `Event.status` and the actual `EventStatus` enum.
- Draft events use `DRAFT`; published events use `PUBLISHED`; completed events use `COMPLETED`; cancelled events use `CANCELLED`.
- Active events use the established platform lifecycle definition: `PUBLISHED` or `REGISTRATION_CLOSED`. `PUBLISHED` is not inferred to mean actively open from a date alone.
- Event creation trends use `Event.createdAt`, never `Event.startDate`.
- Registration totals and trends use `EventRegistration.createdAt`; `registeredAt` is not used because it may be null.
- Confirmed registrations use current status `CONFIRMED`.
- Pending registrations use current statuses `SUBMITTED` or `WAITLISTED`.
- A participating team is a distinct `Team` in a registration whose current status is `CONFIRMED`.
- A participating student is a distinct `STUDENT` user with an `ACTIVE` TeamMember record in a team that has a `CONFIRMED` EventRegistration.
- Average registrations per event is total registrations divided by the scoped event count. Events without registrations remain in the denominator only when they are in the event scope.
- Average students per participating team is distinct active student memberships divided by distinct participating teams.
- The confirmation rate is `CONFIRMED registrations / all registrations x 100`; it is a current-status rate, not a historical funnel conversion.
- Popular events are ranked by confirmed registrations, then distinct participating students, then distinct participating teams, then event title.
- Date filters apply to `Event.createdAt` for platform event lifecycle and creation counts. They apply to `EventRegistration.createdAt` for registration, participation, and registration-based popularity metrics.
- Selecting an event scopes event lifecycle and individual-event values to that event while registration and participation date filters remain based on registration creation time.
- Previous-period comparisons require both start and end dates and use equivalent-duration immediately preceding UTC periods.
- The platform stores current registration status and status history transitions, but event analytics trends show registration creation counts and current status buckets. It does not infer historical status transitions into time-series values.

## Response conventions

- API responses use `success`, `message`, `data`, and optional `filters`.
- Time-series values use `{ "period": "YYYY-MM-DD", "value": 0 }`. The exact calendar bucket is selected by `interval: DAY`, `WEEK`, or `MONTH`.
- Distribution values use `{ "category": "ENUM_VALUE", "count": 0, "percentage": 0 }`.
- KPI values use a stable metric identifier, numeric value, and optional comparison fields in future Task 2 and later endpoints.
- Percentages are rounded to two decimal places and use 0 when the denominator is zero.

## Date and filter conventions

- Analytics timezone is UTC.
- `startDate` and `endDate` use `YYYY-MM-DD`.
- The start date is inclusive at `00:00:00.000Z`.
- The end date is inclusive for the whole selected calendar date and is converted to an exclusive boundary at `00:00:00.000Z` on the following day.
- Omitting date filters applies no date restriction.
- Unknown query fields are rejected. Invalid enum values and UUIDs are rejected.
- `eventId` must identify an existing Event record.

## Schema limitations

- `User.updatedAt` is available, but account activity is not tracked; it must not be used as a login or active-user metric.
- `AccountStatus.INACTIVE` is an explicit status and can be reported independently.
- `EventRegistration.registeredAt` may be null; createdAt is the authoritative record-creation timestamp for registration trends.
- Team member presence can change over time, so historical participation requires status and joinedAt/leftAt data rather than assumptions.
- The platform has no dedicated participant/attendance model. Participation must be derived from active team members and/or confirmed registrations, explicitly documented by the future metric.
- No analytics table or duplicate count is stored.
