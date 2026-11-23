const prisma = require('../../../config/database');
const { Prisma } = require('@prisma/client');
const {
  normalizeAnalyticsFilters,
  getUtcDateOnlyBounds,
  buildCreatedAtFilter,
} = require('./analytics.filters');

const metadata = {
  timezone: 'UTC',
  dateRange: {
    startDateFormat: 'YYYY-MM-DD',
    endDateFormat: 'YYYY-MM-DD',
    startBoundary: 'Inclusive at 00:00:00.000Z',
    endBoundary: 'Inclusive for the selected calendar date; converted to exclusive end at 00:00:00.000Z on the following day',
  },
  reportingIntervals: ['DAY', 'WEEK', 'MONTH'],
  userRoles: ['ADMIN', 'FACULTY', 'STUDENT'],
  accountStatuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  eventStatuses: ['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'],
  teamStatuses: ['ACTIVE', 'ARCHIVED', 'DISBANDED'],
  teamMemberStatuses: ['ACTIVE', 'LEFT', 'REMOVED'],
  registrationStatuses: ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED'],
  evaluatorInvitationStatuses: ['PENDING', 'REVOKED', 'EXPIRED'],
  evaluatorEmailDeliveryStatuses: ['PENDING', 'SENT', 'FAILED'],
  metricSources: {
    users: 'User.createdAt, User.role and User.status',
    events: 'Event.createdAt and Event.status',
    teams: 'Team.createdAt, Team.status and Team.eventId',
    teamMembers: 'TeamMember.teamId, TeamMember.status and TeamMember joinedAt/leftAt timestamps',
    registrations: 'EventRegistration.createdAt and EventRegistration.status',
  },
};

async function getMetadata(payload) {
  const appliedFilters = normalizeAnalyticsFilters(payload);
  if (appliedFilters.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: { id: true },
    });
    if (!event) {
      const error = new Error('Event not found.');
      error.statusCode = 404;
      throw error;
    }
  }
  return { metadata, appliedFilters };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function comparison(current, previous) {
  if (previous === null || previous === undefined) {
    return { previousValue: null, changePercentage: null };
  }
  if (previous === 0) {
    return {
      previousValue: 0,
      changePercentage: current === 0 ? 0 : null,
    };
  }
  return {
    previousValue: previous,
    changePercentage: Number((((current - previous) / previous) * 100).toFixed(2)),
  };
}

function distribution(category, count, denominator) {
  return {
    category,
    count,
    percentage: denominator ? Number(((count / denominator) * 100).toFixed(2)) : 0,
  };
}

function getPreviousBounds(startDate, endDate) {
  if (!startDate || !endDate) return { start: null, endExclusive: null };
  const { start, endExclusive } = getUtcDateOnlyBounds(startDate, endDate);
  const duration = endExclusive.getTime() - start.getTime();
  return {
    start: new Date(start.getTime() - duration),
    endExclusive: start,
  };
}

async function getGrowthSeries(interval, start, endExclusive, eventId) {
  const trunc = interval === 'DAY' ? 'day' : interval === 'WEEK' ? 'week' : 'month';
  const truncExpression = Prisma.raw(`'${trunc}'`);

  function buildWhereClauses() {
    const clauses = [Prisma.sql`1 = 1`];
    if (eventId) clauses.push(Prisma.sql`"id" = ${eventId}::uuid`);
    clauses.push(Prisma.sql`"createdAt" IS NOT NULL`);
    if (start) clauses.push(Prisma.sql`"createdAt" >= ${start}`);
    if (endExclusive) clauses.push(Prisma.sql`"createdAt" < ${endExclusive}`);
    return clauses;
  }

  function buildWhereClausesForTable(tableName) {
    const clauses = [Prisma.sql`1 = 1`];
    if (eventId && tableName !== 'User') {
      const col = tableName === 'Event' ? 'id' : 'eventId';
      clauses.push(Prisma.sql`${Prisma.raw(`"${col}"`)} = ${eventId}::uuid`);
    }
    clauses.push(Prisma.sql`"createdAt" IS NOT NULL`);
    if (start) clauses.push(Prisma.sql`"createdAt" >= ${start}`);
    if (endExclusive) clauses.push(Prisma.sql`"createdAt" < ${endExclusive}`);
    return clauses;
  }

  const [users, events, teams, registrations] = await Promise.all([
    prisma.$queryRaw`
      SELECT date_trunc(${truncExpression}, "createdAt") AS period, COUNT(*)::int AS value
      FROM "User"
      WHERE ${Prisma.join(buildWhereClausesForTable('User'), ' AND ')}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc(${truncExpression}, "createdAt") AS period, COUNT(*)::int AS value
      FROM "Event"
      WHERE ${Prisma.join(buildWhereClausesForTable('Event'), ' AND ')}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc(${truncExpression}, "createdAt") AS period, COUNT(*)::int AS value
      FROM "Team"
      WHERE ${Prisma.join(buildWhereClausesForTable('Team'), ' AND ')}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw`
      SELECT date_trunc(${truncExpression}, "createdAt") AS period, COUNT(*)::int AS value
      FROM "EventRegistration"
      WHERE ${Prisma.join(buildWhereClausesForTable('EventRegistration'), ' AND ')}
      GROUP BY 1
      ORDER BY 1
    `,
  ]);

  const periods = new Set();
  [users, events, teams, registrations].forEach((series) => {
    series.forEach((row) => periods.add(row.period.toISOString()));
  });

  const toMap = (rows) => new Map(rows.map((row) => [row.period.toISOString(), Number(row.value)]));
  const userMap = toMap(users);
  const eventMap = toMap(events);
  const teamMap = toMap(teams);
  const registrationMap = toMap(registrations);

  return [...periods].sort().map((isoPeriod) => ({
    period: isoPeriod.slice(0, 10),
    users: userMap.get(isoPeriod) || 0,
    events: eventMap.get(isoPeriod) || 0,
    teams: teamMap.get(isoPeriod) || 0,
    registrations: registrationMap.get(isoPeriod) || 0,
  }));
}

async function getOverview(payload) {
  const appliedFilters = normalizeAnalyticsFilters(payload);
  if (appliedFilters.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: { id: true },
    });
    if (!event) throw httpError(404, 'Event not found.');
  }

  const dateFilter = buildCreatedAtFilter(appliedFilters.startDate, appliedFilters.endDate);
  const previous = getPreviousBounds(appliedFilters.startDate, appliedFilters.endDate);
  const previousFilter = previous.start && previous.endExclusive
    ? { gte: previous.start, lt: previous.endExclusive }
    : undefined;

  const userWhere = dateFilter ? { createdAt: dateFilter } : {};
  const eventDateFilter = dateFilter ? { createdAt: dateFilter } : {};
  const eventScopeWhere = appliedFilters.eventId
    ? { id: appliedFilters.eventId, ...eventDateFilter }
    : eventDateFilter;
  const teamWhere = {
    ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const registrationWhere = {
    ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const previousUserWhere = previousFilter ? { createdAt: previousFilter } : null;
  const previousEventWhere = appliedFilters.eventId
    ? { id: appliedFilters.eventId, ...(previousFilter ? { createdAt: previousFilter } : {}) }
    : (previousFilter ? { createdAt: previousFilter } : null);
  const previousTeamWhere = previousFilter
    ? { ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}), createdAt: previousFilter }
    : null;
  const previousRegistrationWhere = previousFilter
    ? { ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}), createdAt: previousFilter }
    : null;

  const [
    totalUsers,
    totalStudents,
    totalFaculty,
    totalAdmins,
    totalEvents,
    activeEvents,
    totalTeams,
    totalRegistrations,
    confirmedRegistrations,
    pendingRegistrations,
    previousUsers,
    previousStudents,
    previousFaculty,
    previousAdmins,
    previousEvents,
    previousActiveEvents,
    previousTeams,
    previousRegistrations,
    previousConfirmedRegistrations,
    previousPendingRegistrations,
  ] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: { ...userWhere, role: 'STUDENT' } }),
    prisma.user.count({ where: { ...userWhere, role: 'FACULTY' } }),
    prisma.user.count({ where: { ...userWhere, role: 'ADMIN' } }),
    prisma.event.count({ where: eventScopeWhere }),
    prisma.event.count({ where: { ...eventScopeWhere, status: { in: ['PUBLISHED', 'REGISTRATION_CLOSED'] } } }),
    prisma.team.count({ where: teamWhere }),
    prisma.eventRegistration.count({ where: registrationWhere }),
    prisma.eventRegistration.count({ where: { ...registrationWhere, status: 'CONFIRMED' } }),
    prisma.eventRegistration.count({ where: { ...registrationWhere, status: { in: ['SUBMITTED', 'WAITLISTED'] } } }),
    previousUserWhere ? prisma.user.count({ where: previousUserWhere }) : Promise.resolve(null),
    previousUserWhere ? prisma.user.count({ where: { ...previousUserWhere, role: 'STUDENT' } }) : Promise.resolve(null),
    previousUserWhere ? prisma.user.count({ where: { ...previousUserWhere, role: 'FACULTY' } }) : Promise.resolve(null),
    previousUserWhere ? prisma.user.count({ where: { ...previousUserWhere, role: 'ADMIN' } }) : Promise.resolve(null),
    previousEventWhere ? prisma.event.count({ where: previousEventWhere }) : Promise.resolve(null),
    previousEventWhere ? prisma.event.count({ where: { ...previousEventWhere, status: { in: ['PUBLISHED', 'REGISTRATION_CLOSED'] } } }) : Promise.resolve(null),
    previousTeamWhere ? prisma.team.count({ where: previousTeamWhere }) : Promise.resolve(null),
    previousRegistrationWhere ? prisma.eventRegistration.count({ where: previousRegistrationWhere }) : Promise.resolve(null),
    previousRegistrationWhere ? prisma.eventRegistration.count({ where: { ...previousRegistrationWhere, status: 'CONFIRMED' } }) : Promise.resolve(null),
    previousRegistrationWhere ? prisma.eventRegistration.count({ where: { ...previousRegistrationWhere, status: { in: ['SUBMITTED', 'WAITLISTED'] } } }) : Promise.resolve(null),
  ]);

  const [
    roleGroups,
    eventGroups,
    registrationGroups,
    teamByEventGroups,
    activeMemberCount,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], where: userWhere, _count: { _all: true } }),
    prisma.event.groupBy({ by: ['status'], where: eventScopeWhere, _count: { _all: true } }),
    prisma.eventRegistration.groupBy({ by: ['status'], where: registrationWhere, _count: { _all: true } }),
    prisma.team.groupBy({ by: ['eventId'], where: teamWhere, _count: { _all: true } }),
    prisma.teamMember.count({
      where: {
        status: 'ACTIVE',
        team: {
          ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      },
    }),
  ]);

  const roleCounts = Object.fromEntries(roleGroups.map((row) => [row.role, row._count._all]));
  const eventCounts = Object.fromEntries(eventGroups.map((row) => [row.status, row._count._all]));
  const registrationCounts = Object.fromEntries(registrationGroups.map((row) => [row.status, row._count._all]));

  const teamEventIds = teamByEventGroups.map((row) => row.eventId);
  const teamEvents = teamEventIds.length
    ? await prisma.event.findMany({ where: { id: { in: teamEventIds } }, select: { id: true, title: true } })
    : [];
  const teamEventTitleMap = new Map(teamEvents.map((event) => [event.id, event.title]));
  const teamsByEvent = teamByEventGroups
    .map((row) => ({
      eventId: row.eventId,
      eventTitle: teamEventTitleMap.get(row.eventId) || 'Unknown event',
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const { start, endExclusive } = getUtcDateOnlyBounds(appliedFilters.startDate, appliedFilters.endDate);
  const growth = await getGrowthSeries(appliedFilters.interval, start, endExclusive, appliedFilters.eventId);

  const kpis = {
    totalUsers: { value: totalUsers, scope: 'PLATFORM', ...comparison(totalUsers, previousUsers) },
    totalStudents: { value: totalStudents, scope: 'PLATFORM', ...comparison(totalStudents, previousStudents) },
    totalFaculty: { value: totalFaculty, scope: 'PLATFORM', ...comparison(totalFaculty, previousFaculty) },
    totalAdmins: { value: totalAdmins, scope: 'PLATFORM', ...comparison(totalAdmins, previousAdmins) },
    totalEvents: { value: totalEvents, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(totalEvents, previousEvents) },
    activeEvents: { value: activeEvents, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(activeEvents, previousActiveEvents) },
    totalTeams: { value: totalTeams, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(totalTeams, previousTeams) },
    totalRegistrations: { value: totalRegistrations, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(totalRegistrations, previousRegistrations) },
    confirmedRegistrations: { value: confirmedRegistrations, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(confirmedRegistrations, previousConfirmedRegistrations) },
    pendingRegistrations: { value: pendingRegistrations, scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM', ...comparison(pendingRegistrations, previousPendingRegistrations) },
  };

  const data = {
    kpis,
    growth,
    distributions: {
      userRoles: ['STUDENT', 'FACULTY', 'ADMIN'].map((role) =>
        distribution(role, roleCounts[role] || 0, totalUsers)),
      eventStatuses: ['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'].map((status) =>
        distribution(status, eventCounts[status] || 0, totalEvents)),
      registrationStatuses: ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED'].map((status) =>
        distribution(status, registrationCounts[status] || 0, totalRegistrations)),
    },
    teamOverview: {
      totalTeams,
      averageTeamSize: totalTeams ? Number((activeMemberCount / totalTeams).toFixed(2)) : 0,
      activeTeamMemberCount: activeMemberCount,
      teamsByEvent,
    },
    conventions: {
      activeEventStatuses: ['PUBLISHED', 'REGISTRATION_CLOSED'],
      pendingRegistrationStatuses: ['SUBMITTED', 'WAITLISTED'],
      activeTeamMemberStatus: 'ACTIVE',
      averageTeamSizeBasis: 'ACTIVE TeamMember records divided by scoped Team records',
    },
  };

  return { data, appliedFilters };
}

async function getUserGrowth(interval, start, endExclusive) {
  const trunc = interval === 'DAY' ? 'day' : interval === 'WEEK' ? 'week' : 'month';
  const truncExpression = Prisma.raw(`'${trunc}'`);
  const clauses = [Prisma.sql`1 = 1`];
  clauses.push(Prisma.sql`"createdAt" IS NOT NULL`);
  if (start) clauses.push(Prisma.sql`"createdAt" >= ${start}`);
  if (endExclusive) clauses.push(Prisma.sql`"createdAt" < ${endExclusive}`);

  const rows = await prisma.$queryRaw`
    SELECT
      date_trunc(${truncExpression}, "createdAt") AS period,
      COUNT(*)::int AS users,
      COUNT(*) FILTER (WHERE "role" = 'STUDENT')::int AS students,
      COUNT(*) FILTER (WHERE "role" = 'FACULTY')::int AS faculty,
      COUNT(*) FILTER (WHERE "role" = 'ADMIN')::int AS administrators
    FROM "User"
    WHERE ${Prisma.join(clauses, ' AND ')}
    GROUP BY 1
    ORDER BY 1
  `;

  return rows.map((row) => ({
    period: row.period.toISOString().slice(0, 10),
    users: Number(row.users),
    students: Number(row.students),
    faculty: Number(row.faculty),
    administrators: Number(row.administrators),
  }));
}

async function getUsers(payload) {
  const appliedFilters = normalizeAnalyticsFilters(payload);
  if (appliedFilters.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: { id: true },
    });
    if (!event) throw httpError(404, 'Event not found.');
  }

  const dateFilter = buildCreatedAtFilter(appliedFilters.startDate, appliedFilters.endDate);
  const previous = getPreviousBounds(appliedFilters.startDate, appliedFilters.endDate);
  const previousFilter = previous.start && previous.endExclusive
    ? { gte: previous.start, lt: previous.endExclusive }
    : undefined;

  const [
    totalUsers,
    totalStudents,
    totalFaculty,
    totalAdmins,
    newUsers,
    newStudents,
    newFaculty,
    newAdmins,
    activeAccounts,
    inactiveAccounts,
    suspendedAccounts,
    previousNewUsers,
    previousNewStudents,
    previousNewFaculty,
    previousNewAdmins,
    roleGroups,
    statusGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
    prisma.user.count({ where: { role: 'STUDENT', ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.user.count({ where: { role: 'FACULTY', ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.user.count({ where: { role: 'ADMIN', ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'INACTIVE' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    previousFilter ? prisma.user.count({ where: { createdAt: previousFilter } }) : Promise.resolve(null),
    previousFilter ? prisma.user.count({ where: { role: 'STUDENT', createdAt: previousFilter } }) : Promise.resolve(null),
    previousFilter ? prisma.user.count({ where: { role: 'FACULTY', createdAt: previousFilter } }) : Promise.resolve(null),
    previousFilter ? prisma.user.count({ where: { role: 'ADMIN', createdAt: previousFilter } }) : Promise.resolve(null),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const roleCounts = Object.fromEntries(roleGroups.map((row) => [row.role, row._count._all]));
  const statusCounts = Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all]));

  const participationEventFilter = appliedFilters.eventId
    ? Prisma.sql`AND r."eventId" = ${appliedFilters.eventId}::uuid`
    : Prisma.empty;
  const participationDateFilter = [];
  if (dateFilter?.gte) participationDateFilter.push(Prisma.sql`r."createdAt" >= ${dateFilter.gte}`);
  if (dateFilter?.lt) participationDateFilter.push(Prisma.sql`r."createdAt" < ${dateFilter.lt}`);
  const participationDateSql = participationDateFilter.length
    ? Prisma.sql`AND ${Prisma.join(participationDateFilter, ' AND ')}`
    : Prisma.empty;

  const [participationRows, registrationCountRows, eventParticipationRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT tm."userId")::int AS participating
      FROM "TeamMember" tm
      JOIN "Team" t ON t."id" = tm."teamId"
      JOIN "User" u ON u."id" = tm."userId"
      JOIN "EventRegistration" r ON r."teamId" = t."id"
      WHERE tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        AND r."status" = 'CONFIRMED'
        ${participationEventFilter}
        ${participationDateSql}
    `,
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT r."id")::int AS registrations
      FROM "EventRegistration" r
      JOIN "Team" t ON t."id" = r."teamId"
      JOIN "TeamMember" tm ON tm."teamId" = t."id"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        AND r."status" = 'CONFIRMED'
        ${participationEventFilter}
        ${participationDateSql}
    `,
    prisma.$queryRaw`
      SELECT r."eventId", e."title",
             COUNT(DISTINCT tm."userId")::int AS students
      FROM "EventRegistration" r
      JOIN "Event" e ON e."id" = r."eventId"
      JOIN "Team" t ON t."id" = r."teamId"
      JOIN "TeamMember" tm ON tm."teamId" = t."id"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        AND r."status" = 'CONFIRMED'
        ${participationEventFilter}
        ${participationDateSql}
      GROUP BY r."eventId", e."title"
      ORDER BY students DESC
      LIMIT 8
    `,
  ]);

  const participatingStudents = Number(participationRows[0]?.participating || 0);
  const confirmedRegistrationCount = Number(registrationCountRows[0]?.registrations || 0);
  const nonParticipatingStudents = Math.max(totalStudents - participatingStudents, 0);
  const participationRate = totalStudents
    ? Number(((participatingStudents / totalStudents) * 100).toFixed(2))
    : 0;
  const averageRegistrations = participatingStudents
    ? Number((confirmedRegistrationCount / participatingStudents).toFixed(2))
    : 0;

  const { start, endExclusive } = getUtcDateOnlyBounds(appliedFilters.startDate, appliedFilters.endDate);
  const growth = await getUserGrowth(appliedFilters.interval, start, endExclusive);

  const data = {
    summary: {
      totalUsers,
      totalStudents,
      totalFaculty,
      totalAdmins,
      newUsers,
      newStudents,
      activeAccounts,
      inactiveAccounts,
      suspendedAccounts,
    },
    acquisition: {
      newUsers: { value: newUsers, ...comparison(newUsers, previousNewUsers) },
      newStudents: { value: newStudents, ...comparison(newStudents, previousNewStudents) },
      newFaculty: { value: newFaculty, ...comparison(newFaculty, previousNewFaculty) },
      newAdmins: { value: newAdmins, ...comparison(newAdmins, previousNewAdmins) },
    },
    growth,
    roles: ['STUDENT', 'FACULTY', 'ADMIN'].map((role) =>
      distribution(role, roleCounts[role] || 0, totalUsers)),
    accountStatus: ['ACTIVE', 'INACTIVE', 'SUSPENDED'].map((status) =>
      distribution(status, statusCounts[status] || 0, totalUsers)),
    participation: {
      participatingStudents,
      nonParticipatingStudents,
      participationRate,
      confirmedRegistrationCount,
      averageRegistrationsPerParticipatingStudent: averageRegistrations,
      mostParticipatingEvents: eventParticipationRows.map((row) => ({
        eventId: row.eventId,
        eventTitle: row.title,
        participatingStudents: Number(row.students),
      })),
      definition: 'A participating student is a unique STUDENT with an ACTIVE TeamMember record in a team whose EventRegistration status is CONFIRMED.',
      engagementSource: 'Event participation through confirmed registrations and active team membership; no login or last-access data is used.',
    },
    conventions: {
      totalScope: 'All-time platform account totals.',
      acquisitionScope: 'Selected UTC date range.',
      eventScope: 'The event filter applies only to participation metrics.',
      verifiedAccounts: null,
      verifiedAccountsLimitation: 'No account verification field exists in the User model.',
    },
  };

  return { data, appliedFilters };
}

async function getEventRegistrationGrowth(interval, start, endExclusive, eventId) {
  const trunc = interval === 'DAY' ? 'day' : interval === 'WEEK' ? 'week' : 'month';
  const unit = Prisma.raw(`'${trunc}'`);
  const clauses = [Prisma.sql`1 = 1`];
  if (eventId) clauses.push(Prisma.sql`"eventId" = ${eventId}::uuid`);
  if (start) clauses.push(Prisma.sql`"createdAt" >= ${start}`);
  if (endExclusive) clauses.push(Prisma.sql`"createdAt" < ${endExclusive}`);
  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${unit}, "createdAt") AS period,
      COUNT(*)::int AS registrations,
      COUNT(*) FILTER (WHERE "status" = 'DRAFT')::int AS draft,
      COUNT(*) FILTER (WHERE "status" = 'CONFIRMED')::int AS confirmed,
      COUNT(*) FILTER (WHERE "status" IN ('SUBMITTED', 'WAITLISTED'))::int AS pending,
      COUNT(*) FILTER (WHERE "status" = 'REJECTED')::int AS rejected,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::int AS cancelled,
      COUNT(*) FILTER (WHERE "status" = 'WAITLISTED')::int AS waitlisted
    FROM "EventRegistration"
    WHERE ${Prisma.join(clauses, ' AND ')}
    GROUP BY 1 ORDER BY 1
  `;
  return rows.map((row) => ({
    period: row.period.toISOString().slice(0, 10), registrations: Number(row.registrations),
    draft: Number(row.draft), confirmed: Number(row.confirmed), pending: Number(row.pending),
    rejected: Number(row.rejected), cancelled: Number(row.cancelled), waitlisted: Number(row.waitlisted),
  }));
}

async function getEventCreationGrowth(interval, start, endExclusive, eventId) {
  const trunc = interval === 'DAY' ? 'day' : interval === 'WEEK' ? 'week' : 'month';
  const unit = Prisma.raw(`'${trunc}'`);
  const clauses = [Prisma.sql`"createdAt" IS NOT NULL`];
  if (eventId) clauses.push(Prisma.sql`"id" = ${eventId}::uuid`);
  if (start) clauses.push(Prisma.sql`"createdAt" >= ${start}`);
  if (endExclusive) clauses.push(Prisma.sql`"createdAt" < ${endExclusive}`);

  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${unit}, "createdAt") AS period,
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE "status" = 'PUBLISHED')::int AS published,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED')::int AS completed,
      COUNT(*) FILTER (WHERE "status" = 'CANCELLED')::int AS cancelled
    FROM "Event"
    WHERE ${Prisma.join(clauses, ' AND ')}
    GROUP BY 1
    ORDER BY 1
  `;

  return rows.map((row) => ({
    period: row.period.toISOString().slice(0, 10),
    events: Number(row.events),
    published: Number(row.published),
    completed: Number(row.completed),
    cancelled: Number(row.cancelled),
  }));
}

async function getEvents(payload) {
  const appliedFilters = normalizeAnalyticsFilters(payload);
  if (appliedFilters.eventId) {
    const exists = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: { id: true },
    });
    if (!exists) throw httpError(404, 'Event not found.');
  }

  const dateFilter = buildCreatedAtFilter(appliedFilters.startDate, appliedFilters.endDate);
  const previous = getPreviousBounds(appliedFilters.startDate, appliedFilters.endDate);
  const previousFilter = previous.start ? { gte: previous.start, lt: previous.endExclusive } : null;

  const eventScope = {
    ...(appliedFilters.eventId ? { id: appliedFilters.eventId } : {}),
    ...(!appliedFilters.eventId && dateFilter ? { createdAt: dateFilter } : {}),
  };
  const registrationScope = {
    ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const previousEventScope = previousFilter
    ? {
      ...(appliedFilters.eventId ? { id: appliedFilters.eventId } : {}),
      createdAt: previousFilter,
    }
    : null;
  const previousRegistrationScope = previousFilter
    ? {
      ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
      createdAt: previousFilter,
    }
    : null;

  const statuses = ['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED'];
  const registrationStatuses = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED'];

  const [
    totalEvents,
    eventGroups,
    totalRegistrations,
    registrationGroups,
    previousEvents,
    previousRegistrations,
    previousConfirmed,
    participationRows,
    previousParticipationRows,
    popularityRows,
    assignmentRows,
  ] = await Promise.all([
    prisma.event.count({ where: eventScope }),
    prisma.event.groupBy({ by: ['status'], where: eventScope, _count: { _all: true } }),
    prisma.eventRegistration.count({ where: registrationScope }),
    prisma.eventRegistration.groupBy({ by: ['status'], where: registrationScope, _count: { _all: true } }),
    previousEventScope ? prisma.event.count({ where: previousEventScope }) : Promise.resolve(null),
    previousRegistrationScope ? prisma.eventRegistration.count({ where: previousRegistrationScope }) : Promise.resolve(null),
    previousRegistrationScope ? prisma.eventRegistration.count({ where: { ...previousRegistrationScope, status: 'CONFIRMED' } }) : Promise.resolve(null),
    prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT r."teamId")::int AS teams,
        COUNT(DISTINCT tm."userId")::int AS students,
        COUNT(DISTINCT tm."id")::int AS memberships
      FROM "EventRegistration" r
      JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE r."status" = 'CONFIRMED'
        AND tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        ${appliedFilters.eventId ? Prisma.sql`AND r."eventId" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
        ${dateFilter?.gte ? Prisma.sql`AND r."createdAt" >= ${dateFilter.gte}` : Prisma.empty}
        ${dateFilter?.lt ? Prisma.sql`AND r."createdAt" < ${dateFilter.lt}` : Prisma.empty}
    `,
    previousFilter ? prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT r."teamId")::int AS teams,
        COUNT(DISTINCT tm."userId")::int AS students
      FROM "EventRegistration" r
      JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE r."status" = 'CONFIRMED'
        AND tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        ${appliedFilters.eventId ? Prisma.sql`AND r."eventId" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
        AND r."createdAt" >= ${previousFilter.gte}
        AND r."createdAt" < ${previousFilter.lt}
    ` : Promise.resolve([]),
    prisma.$queryRaw`
      SELECT
        e."id" AS "eventId",
        e."title",
        e."status",
        COUNT(DISTINCT r."id")::int AS confirmed,
        COUNT(DISTINCT r."teamId") FILTER (WHERE r."status" = 'CONFIRMED')::int AS teams,
        COUNT(DISTINCT tm."userId") FILTER (WHERE r."status" = 'CONFIRMED' AND tm."status" = 'ACTIVE' AND u."role" = 'STUDENT')::int AS students
      FROM "Event" e
      LEFT JOIN "EventRegistration" r ON r."eventId" = e."id"
        AND r."status" = 'CONFIRMED'
        ${dateFilter?.gte ? Prisma.sql`AND r."createdAt" >= ${dateFilter.gte}` : Prisma.empty}
        ${dateFilter?.lt ? Prisma.sql`AND r."createdAt" < ${dateFilter.lt}` : Prisma.empty}
      LEFT JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      LEFT JOIN "User" u ON u."id" = tm."userId"
      WHERE 1 = 1
        ${appliedFilters.eventId ? Prisma.sql`AND e."id" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
        ${!appliedFilters.eventId && dateFilter?.gte ? Prisma.sql`AND e."createdAt" >= ${dateFilter.gte}` : Prisma.empty}
        ${!appliedFilters.eventId && dateFilter?.lt ? Prisma.sql`AND e."createdAt" < ${dateFilter.lt}` : Prisma.empty}
      GROUP BY e."id", e."title", e."status"
      ORDER BY confirmed DESC, students DESC, teams DESC, e."title" ASC
      LIMIT 8
    `,
    appliedFilters.eventId ? prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*)::int FROM "EventFacultyAssignment" WHERE "eventId" = ${appliedFilters.eventId}::uuid) AS faculty,
        (SELECT COUNT(*)::int FROM "EventEvaluatorInvitation" WHERE "eventId" = ${appliedFilters.eventId}::uuid) AS evaluators,
        (SELECT COUNT(*)::int FROM "EventEvaluatorInvitation" WHERE "eventId" = ${appliedFilters.eventId}::uuid AND "status" = 'PENDING') AS evaluator_pending,
        (SELECT COUNT(*)::int FROM "EventEvaluatorInvitation" WHERE "eventId" = ${appliedFilters.eventId}::uuid AND "status" = 'REVOKED') AS evaluator_revoked,
        (SELECT COUNT(*)::int FROM "EventEvaluatorInvitation" WHERE "eventId" = ${appliedFilters.eventId}::uuid AND "status" = 'EXPIRED') AS evaluator_expired,
        (SELECT COUNT(*)::int FROM "EventEvaluatorInvitation" WHERE "eventId" = ${appliedFilters.eventId}::uuid AND "emailDeliveryStatus" = 'SENT') AS evaluator_email_sent
    ` : Promise.resolve([]),
  ]);

  const eventCounts = Object.fromEntries(eventGroups.map((row) => [row.status, row._count._all]));
  const registrationCounts = Object.fromEntries(registrationGroups.map((row) => [row.status, row._count._all]));
  const confirmedRegistrations = registrationCounts.CONFIRMED || 0;
  const pendingRegistrations = (registrationCounts.SUBMITTED || 0) + (registrationCounts.WAITLISTED || 0);
  const participation = participationRows[0] || {};
  const previousParticipation = previousParticipationRows[0] || {};
  const teams = Number(participation.teams || 0);
  const students = Number(participation.students || 0);
  const memberships = Number(participation.memberships || 0);
  const previousTeams = previousFilter ? Number(previousParticipation.teams || 0) : null;
  const previousStudents = previousFilter ? Number(previousParticipation.students || 0) : null;

  const { start, endExclusive } = getUtcDateOnlyBounds(appliedFilters.startDate, appliedFilters.endDate);
  const eventGrowth = await getEventCreationGrowth(appliedFilters.interval, start, endExclusive, appliedFilters.eventId);
  const registrationGrowth = await getEventRegistrationGrowth(
    appliedFilters.interval,
    start,
    endExclusive,
    appliedFilters.eventId,
  );

  let eventDetails = null;
  if (appliedFilters.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: {
        id: true,
        title: true,
        status: true,
        mode: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        registrationStartDate: true,
        registrationEndDate: true,
        registrationCapacity: true,
      },
    });
    const assignments = assignmentRows[0] || {};
    eventDetails = {
      event,
      registrationSummary: {
        total: totalRegistrations,
        draft: registrationCounts.DRAFT || 0,
        submitted: registrationCounts.SUBMITTED || 0,
        confirmed: confirmedRegistrations,
        pending: pendingRegistrations,
        rejected: registrationCounts.REJECTED || 0,
        cancelled: registrationCounts.CANCELLED || 0,
        waitlisted: registrationCounts.WAITLISTED || 0,
      },
      participationSummary: {
        participatingTeams: teams,
        participatingStudents: students,
        averageStudentsPerParticipatingTeam: teams ? Number((memberships / teams).toFixed(2)) : 0,
      },
      registrationActivity: {
        trend: registrationGrowth,
        statusDistribution: registrationStatuses.map((status) =>
          distribution(status, registrationCounts[status] || 0, totalRegistrations)),
      },
      facultyAssignments: Number(assignments.faculty || 0),
      evaluatorInvitations: {
        total: Number(assignments.evaluators || 0),
        pending: Number(assignments.evaluator_pending || 0),
        revoked: Number(assignments.evaluator_revoked || 0),
        expired: Number(assignments.evaluator_expired || 0),
        emailSent: Number(assignments.evaluator_email_sent || 0),
      },
    };
  }

  return { appliedFilters, data: {
    summary: {
      totalEvents,
      draftEvents: eventCounts.DRAFT || 0,
      publishedEvents: eventCounts.PUBLISHED || 0,
      activeEvents: (eventCounts.PUBLISHED || 0) + (eventCounts.REGISTRATION_CLOSED || 0),
      completedEvents: eventCounts.COMPLETED || 0,
      cancelledEvents: eventCounts.CANCELLED || 0,
      totalRegistrations,
      confirmedRegistrations,
      pendingRegistrations,
      participatingTeams: teams,
      participatingStudents: students,
      averageRegistrationsPerEvent: totalEvents
        ? Number((totalRegistrations / totalEvents).toFixed(2))
        : 0,
      scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM',
    },
    lifecycle: statuses.map((status) => distribution(status, eventCounts[status] || 0, totalEvents)),
    eventGrowth,
    registrationTrends: registrationGrowth,
    registrationStatus: registrationStatuses.map((status) => distribution(status, registrationCounts[status] || 0, totalRegistrations)),
    popularity: popularityRows.map((row) => ({
      eventId: row.eventId,
      title: row.title,
      status: row.status,
      confirmedRegistrations: Number(row.confirmed),
      participatingTeams: Number(row.teams),
      participatingStudents: Number(row.students),
    })),
    participation: {
      participatingTeams: teams,
      participatingStudents: students,
      confirmedRegistrations,
      averageStudentsPerParticipatingTeam: teams
        ? Number((memberships / teams).toFixed(2))
        : 0,
      definition: 'Distinct STUDENT users with ACTIVE TeamMember records in teams with CONFIRMED registrations.',
    },
    conversion: {
      confirmedRegistrations,
      totalRegistrations,
      currentConfirmationRate: totalRegistrations
        ? Number(((confirmedRegistrations / totalRegistrations) * 100).toFixed(2))
        : 0,
      definition: 'Current confirmation rate, not a historical conversion funnel.',
    },
    comparisons: {
      eventsCreated: comparison(totalEvents, previousEvents),
      registrationsReceived: comparison(totalRegistrations, previousRegistrations),
      confirmedRegistrations: comparison(confirmedRegistrations, previousConfirmed),
      participatingTeams: comparison(teams, previousTeams),
      participatingStudents: comparison(students, previousStudents),
    },
    eventDetails,
    conventions: {
      activeEventStatuses: ['PUBLISHED', 'REGISTRATION_CLOSED'],
      pendingRegistrationStatuses: ['SUBMITTED', 'WAITLISTED'],
      eventScope: appliedFilters.eventId
        ? 'The selected event lifecycle is fixed to the event ID; registration metrics and trends use EventRegistration.createdAt.'
        : 'Event lifecycle and event creation trends use Event.createdAt; registration metrics, participation, and popularity use EventRegistration.createdAt.',
      popularityMetric: 'Ranked by confirmed registrations, then unique participating students, then unique participating teams, then event title.',
      participationDefinition: 'Distinct STUDENT users with ACTIVE TeamMember records in teams with CONFIRMED registrations.',
      historicalConversion: 'No attendance or historical status snapshot model is used; the confirmation rate reflects current status.',
    },
  }};
}

async function getTeamFormationGrowth(interval, start, endExclusive, eventId) {
  const trunc = interval === 'DAY' ? 'day' : interval === 'WEEK' ? 'week' : 'month';
  const unit = Prisma.raw(`'${trunc}'`);
  const clauses = [Prisma.sql`t."createdAt" IS NOT NULL`];
  if (eventId) clauses.push(Prisma.sql`t."eventId" = ${eventId}::uuid`);
  if (start) clauses.push(Prisma.sql`t."createdAt" >= ${start}`);
  if (endExclusive) clauses.push(Prisma.sql`t."createdAt" < ${endExclusive}`);

  const rows = await prisma.$queryRaw`
    SELECT
      date_trunc(${unit}, t."createdAt") AS period,
      COUNT(*)::int AS teams,
      COUNT(*) FILTER (WHERE t."status" = 'ACTIVE')::int AS active,
      COUNT(*) FILTER (WHERE t."status" = 'ARCHIVED')::int AS archived,
      COUNT(*) FILTER (WHERE t."status" = 'DISBANDED')::int AS disbanded
    FROM "Team" t
    WHERE ${Prisma.join(clauses, ' AND ')}
    GROUP BY 1
    ORDER BY 1
  `;

  return rows.map((row) => ({
    period: row.period.toISOString().slice(0, 10),
    teams: Number(row.teams),
    active: Number(row.active),
    archived: Number(row.archived),
    disbanded: Number(row.disbanded),
  }));
}

async function getTeamsRegistrations(payload) {
  const appliedFilters = normalizeAnalyticsFilters(payload);
  if (appliedFilters.eventId) {
    const exists = await prisma.event.findUnique({
      where: { id: appliedFilters.eventId },
      select: { id: true },
    });
    if (!exists) throw httpError(404, 'Event not found.');
  }

  const dateFilter = buildCreatedAtFilter(appliedFilters.startDate, appliedFilters.endDate);
  const previous = getPreviousBounds(appliedFilters.startDate, appliedFilters.endDate);
  const previousFilter = previous.start ? { gte: previous.start, lt: previous.endExclusive } : null;

  // Scoping helpers
  const teamScope = {
    ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const regScope = {
    ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };
  const prevTeamScope = previousFilter
    ? { ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}), createdAt: previousFilter }
    : null;
  const prevRegScope = previousFilter
    ? { ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}), createdAt: previousFilter }
    : null;

  const eventIdSql = appliedFilters.eventId
    ? Prisma.sql`AND t."eventId" = ${appliedFilters.eventId}::uuid`
    : Prisma.empty;
  const teamDateGte = dateFilter?.gte
    ? Prisma.sql`AND t."createdAt" >= ${dateFilter.gte}`
    : Prisma.empty;
  const teamDateLt = dateFilter?.lt
    ? Prisma.sql`AND t."createdAt" < ${dateFilter.lt}`
    : Prisma.empty;
  const regDateGte = dateFilter?.gte
    ? Prisma.sql`AND r."createdAt" >= ${dateFilter.gte}`
    : Prisma.empty;
  const regDateLt = dateFilter?.lt
    ? Prisma.sql`AND r."createdAt" < ${dateFilter.lt}`
    : Prisma.empty;

  const [
    totalTeams,
    teamStatusGroups,
    totalRegistrations,
    regStatusGroups,
    prevTotalTeams,
    prevTotalRegs,
    prevConfirmedRegs,
    // participation: teams with confirmed registrations, distinct students
    participationRows,
    prevParticipationRows,
    // teams that have at least one registration
    teamsWithRegRows,
    // team size distribution: count of ACTIVE members per team
    teamSizeRows,
    // event-wise breakdown
    eventWiseRows,
    // popular teams: ranked by confirmed registrations
    popularTeamRows,
  ] = await Promise.all([
    prisma.team.count({ where: teamScope }),
    prisma.team.groupBy({ by: ['status'], where: teamScope, _count: { _all: true } }),
    prisma.eventRegistration.count({ where: regScope }),
    prisma.eventRegistration.groupBy({ by: ['status'], where: regScope, _count: { _all: true } }),
    prevTeamScope ? prisma.team.count({ where: prevTeamScope }) : Promise.resolve(null),
    prevRegScope ? prisma.eventRegistration.count({ where: prevRegScope }) : Promise.resolve(null),
    prevRegScope ? prisma.eventRegistration.count({ where: { ...prevRegScope, status: 'CONFIRMED' } }) : Promise.resolve(null),
    // Participation: distinct STUDENT users with ACTIVE TeamMember in teams with CONFIRMED registrations
    prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT r."teamId")::int AS confirmed_teams,
        COUNT(DISTINCT tm."userId")::int AS students,
        COUNT(DISTINCT tm."id")::int AS memberships
      FROM "EventRegistration" r
      JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE r."status" = 'CONFIRMED'
        AND tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        ${appliedFilters.eventId ? Prisma.sql`AND r."eventId" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
        ${dateFilter?.gte ? Prisma.sql`AND r."createdAt" >= ${dateFilter.gte}` : Prisma.empty}
        ${dateFilter?.lt ? Prisma.sql`AND r."createdAt" < ${dateFilter.lt}` : Prisma.empty}
    `,
    previousFilter ? prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT r."teamId")::int AS confirmed_teams,
        COUNT(DISTINCT tm."userId")::int AS students
      FROM "EventRegistration" r
      JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      JOIN "User" u ON u."id" = tm."userId"
      WHERE r."status" = 'CONFIRMED'
        AND tm."status" = 'ACTIVE'
        AND u."role" = 'STUDENT'
        ${appliedFilters.eventId ? Prisma.sql`AND r."eventId" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
        AND r."createdAt" >= ${previousFilter.gte}
        AND r."createdAt" < ${previousFilter.lt}
    ` : Promise.resolve([]),
    // Teams that have at least one registration (any status)
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT t."id")::int AS teams_with_reg
      FROM "Team" t
      JOIN "EventRegistration" r ON r."teamId" = t."id"
      WHERE 1 = 1
        ${eventIdSql}
        ${teamDateGte}
        ${teamDateLt}
    `,
    // Team size distribution: bucket ACTIVE member counts per team
    prisma.$queryRaw`
      SELECT
        CASE
          WHEN active_members = 1 THEN '1'
          WHEN active_members = 2 THEN '2'
          WHEN active_members = 3 THEN '3'
          WHEN active_members = 4 THEN '4'
          WHEN active_members = 5 THEN '5'
          ELSE '6+'
        END AS bucket,
        COUNT(*)::int AS team_count
      FROM (
        SELECT t."id", COUNT(tm."id")::int AS active_members
        FROM "Team" t
        LEFT JOIN "TeamMember" tm ON tm."teamId" = t."id" AND tm."status" = 'ACTIVE'
        WHERE 1 = 1
          ${eventIdSql}
          ${teamDateGte}
          ${teamDateLt}
        GROUP BY t."id"
      ) sub
      GROUP BY bucket
      ORDER BY bucket
    `,
    // Event-wise breakdown
    prisma.$queryRaw`
      SELECT
        e."id" AS "eventId",
        e."title",
        e."status" AS "eventStatus",
        COUNT(DISTINCT t."id")::int AS total_teams,
        COUNT(DISTINCT r."id")::int AS total_regs,
        COUNT(DISTINCT r."id") FILTER (WHERE r."status" = 'CONFIRMED')::int AS confirmed_regs,
        COUNT(DISTINCT r."id") FILTER (WHERE r."status" IN ('SUBMITTED', 'WAITLISTED'))::int AS pending_regs,
        COUNT(DISTINCT tm."userId") FILTER (WHERE r."status" = 'CONFIRMED' AND tm."status" = 'ACTIVE' AND u."role" = 'STUDENT')::int AS students,
        CASE
          WHEN COUNT(DISTINCT r."id") = 0 THEN 0
          ELSE ROUND(
            COUNT(DISTINCT r."id") FILTER (WHERE r."status" = 'CONFIRMED')::numeric
            / COUNT(DISTINCT r."id")::numeric * 100, 2
          )
        END AS confirmation_rate
      FROM "Event" e
      LEFT JOIN "Team" t ON t."eventId" = e."id"
        ${teamDateGte}
        ${teamDateLt}
      LEFT JOIN "EventRegistration" r ON r."eventId" = e."id"
        ${regDateGte}
        ${regDateLt}
      LEFT JOIN "TeamMember" tm ON tm."teamId" = r."teamId"
      LEFT JOIN "User" u ON u."id" = tm."userId"
      WHERE 1 = 1
        ${appliedFilters.eventId ? Prisma.sql`AND e."id" = ${appliedFilters.eventId}::uuid` : Prisma.empty}
      GROUP BY e."id", e."title", e."status"
      ORDER BY confirmed_regs DESC, total_teams DESC, e."title" ASC
      LIMIT 10
    `,
    // Popular teams: ranked by confirmed registrations, then active member count
    prisma.$queryRaw`
      SELECT
        t."id" AS "teamId",
        t."name",
        t."status",
        e."title" AS "eventTitle",
        COUNT(DISTINCT r."id") FILTER (WHERE r."status" = 'CONFIRMED')::int AS confirmed_regs,
        COUNT(DISTINCT tm."id") FILTER (WHERE tm."status" = 'ACTIVE')::int AS active_members,
        COUNT(DISTINCT r."id")::int AS total_regs
      FROM "Team" t
      JOIN "Event" e ON e."id" = t."eventId"
      LEFT JOIN "EventRegistration" r ON r."teamId" = t."id"
        ${regDateGte}
        ${regDateLt}
      LEFT JOIN "TeamMember" tm ON tm."teamId" = t."id"
      WHERE 1 = 1
        ${eventIdSql}
        ${teamDateGte}
        ${teamDateLt}
      GROUP BY t."id", t."name", t."status", e."title"
      ORDER BY confirmed_regs DESC, active_members DESC, t."name" ASC
      LIMIT 10
    `,
  ]);

  // Derive counts
  const teamCounts = Object.fromEntries(teamStatusGroups.map((r) => [r.status, r._count._all]));
  const regCounts = Object.fromEntries(regStatusGroups.map((r) => [r.status, r._count._all]));
  const confirmedRegs = regCounts.CONFIRMED || 0;
  const pendingRegs = (regCounts.SUBMITTED || 0) + (regCounts.WAITLISTED || 0);

  const part = participationRows[0] || {};
  const prevPart = prevParticipationRows[0] || {};
  const confirmedTeams = Number(part.confirmed_teams || 0);
  const participatingStudents = Number(part.students || 0);
  const totalMemberships = Number(part.memberships || 0);
  const prevConfirmedTeams = previousFilter ? Number(prevPart.confirmed_teams || 0) : null;
  const prevStudents = previousFilter ? Number(prevPart.students || 0) : null;

  const teamsWithReg = Number(teamsWithRegRows[0]?.teams_with_reg || 0);
  const teamsWithoutReg = Math.max(totalTeams - teamsWithReg, 0);

  // Active member count across all scoped teams
  const activeMemberCount = await prisma.teamMember.count({
    where: {
      status: 'ACTIVE',
      team: {
        ...(appliedFilters.eventId ? { eventId: appliedFilters.eventId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    },
  });

  const avgMembersPerTeam = totalTeams ? Number((activeMemberCount / totalTeams).toFixed(2)) : 0;
  const avgMembersPerConfirmedTeam = confirmedTeams
    ? Number((totalMemberships / confirmedTeams).toFixed(2))
    : 0;

  // Team size distribution — ordered buckets
  const bucketOrder = ['1', '2', '3', '4', '5', '6+'];
  const sizeMap = new Map(teamSizeRows.map((r) => [String(r.bucket), Number(r.team_count)]));
  const teamSizeDistribution = bucketOrder.map((bucket) => ({
    bucket,
    count: sizeMap.get(bucket) || 0,
  }));

  // Trends
  const { start, endExclusive } = getUtcDateOnlyBounds(appliedFilters.startDate, appliedFilters.endDate);
  const [teamGrowth, registrationTrend] = await Promise.all([
    getTeamFormationGrowth(appliedFilters.interval, start, endExclusive, appliedFilters.eventId),
    getEventRegistrationGrowth(appliedFilters.interval, start, endExclusive, appliedFilters.eventId),
  ]);

  const teamStatuses = ['ACTIVE', 'ARCHIVED', 'DISBANDED'];
  const regStatuses = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED'];

  return {
    appliedFilters,
    data: {
      teamSummary: {
        totalTeams,
        activeTeams: teamCounts.ACTIVE || 0,
        archivedTeams: teamCounts.ARCHIVED || 0,
        disbandedTeams: teamCounts.DISBANDED || 0,
        teamsWithRegistration: teamsWithReg,
        teamsWithoutRegistration: teamsWithoutReg,
        activeMemberCount,
        averageMembersPerTeam: avgMembersPerTeam,
        scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM',
      },
      registrationSummary: {
        totalRegistrations,
        confirmedRegistrations: confirmedRegs,
        pendingRegistrations: pendingRegs,
        submittedRegistrations: regCounts.SUBMITTED || 0,
        waitlistedRegistrations: regCounts.WAITLISTED || 0,
        rejectedRegistrations: regCounts.REJECTED || 0,
        cancelledRegistrations: regCounts.CANCELLED || 0,
        draftRegistrations: regCounts.DRAFT || 0,
        scope: appliedFilters.eventId ? 'EVENT' : 'PLATFORM',
      },
      participation: {
        confirmedTeams,
        participatingStudents,
        averageMembersPerConfirmedTeam: avgMembersPerConfirmedTeam,
        definition: 'Confirmed teams: distinct teams with CONFIRMED registrations. Participating students: distinct STUDENT users with ACTIVE TeamMember records in those teams.',
      },
      teamStatusDistribution: teamStatuses.map((s) => distribution(s, teamCounts[s] || 0, totalTeams)),
      registrationStatusDistribution: regStatuses.map((s) => distribution(s, regCounts[s] || 0, totalRegistrations)),
      teamSizeDistribution,
      teamGrowth,
      registrationTrend,
      eventWise: eventWiseRows.map((row) => ({
        eventId: row.eventId,
        title: row.title,
        eventStatus: row.eventStatus,
        totalTeams: Number(row.total_teams),
        totalRegistrations: Number(row.total_regs),
        confirmedRegistrations: Number(row.confirmed_regs),
        pendingRegistrations: Number(row.pending_regs),
        participatingStudents: Number(row.students),
        confirmationRate: Number(row.confirmation_rate),
      })),
      popularTeams: popularTeamRows.map((row) => ({
        teamId: row.teamId,
        name: row.name,
        status: row.status,
        eventTitle: row.eventTitle,
        confirmedRegistrations: Number(row.confirmed_regs),
        activeMembers: Number(row.active_members),
        totalRegistrations: Number(row.total_regs),
      })),
      conversion: {
        totalRegistrations,
        confirmedRegistrations: confirmedRegs,
        currentConfirmationRate: totalRegistrations
          ? Number(((confirmedRegs / totalRegistrations) * 100).toFixed(2))
          : 0,
        definition: 'Current confirmation rate = confirmed registrations / total registrations × 100. Reflects current status, not historical transitions.',
      },
      comparisons: {
        totalTeams: comparison(totalTeams, prevTotalTeams),
        totalRegistrations: comparison(totalRegistrations, prevTotalRegs),
        confirmedRegistrations: comparison(confirmedRegs, prevConfirmedRegs),
        confirmedTeams: comparison(confirmedTeams, prevConfirmedTeams),
        participatingStudents: comparison(participatingStudents, prevStudents),
      },
      conventions: {
        teamStatuses: ['ACTIVE', 'ARCHIVED', 'DISBANDED'],
        pendingRegistrationStatuses: ['SUBMITTED', 'WAITLISTED'],
        participationDefinition: 'Distinct STUDENT users with ACTIVE TeamMember records in teams with CONFIRMED registrations.',
        averageMembersBasis: 'ACTIVE TeamMember records divided by total scoped teams.',
        confirmationRateBasis: 'Current registration status; no historical status transitions are used.',
      },
    },
  };
}

module.exports = { getMetadata, getOverview, getUsers, getEvents, getTeamsRegistrations };
