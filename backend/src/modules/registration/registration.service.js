const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const REGISTRATION_SELECT = {
  id: true, eventId: true, teamId: true, status: true, registeredAt: true, reviewedAt: true,
  reviewedById: true, rejectionReason: true, createdAt: true, updatedAt: true,
  event: { select: { id: true, title: true, slug: true, status: true, mode: true, startDate: true, endDate: true, registrationStartDate: true, registrationEndDate: true, registrationCapacity: true, minTeamSize: true, maxTeamSize: true, eligibility: true, rules: true } },
  team: { select: { id: true, name: true, description: true, leaderId: true, status: true, leader: { select: { id: true, name: true, email: true } }, members: { select: { id: true, role: true, status: true, joinedAt: true, user: { select: { id: true, name: true, email: true, status: true } } } } } },
  reviewedBy: { select: { id: true, name: true, email: true } },
  history: { orderBy: { createdAt: 'desc' }, select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true, changedBy: { select: { id: true, name: true } } } },
};

async function submitRegistration(userId, teamId) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      include: { event: true, members: true },
    });
    if (!team) throw httpError(404, 'Team not found.');
    if (team.leaderId !== userId) throw httpError(403, 'Only the team leader can submit this registration.');
    if (team.status !== 'ACTIVE') throw httpError(409, 'The team is not active.');

    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${team.eventId}::uuid FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: team.eventId } });
    if (!event) throw httpError(404, 'Event not found.');
    if (event.status !== 'PUBLISHED') throw httpError(409, 'Event registration is not open.');

    const now = new Date();
    if (!event.registrationStartDate || now < event.registrationStartDate) throw httpError(409, 'Event registration has not started.');
    if (!event.registrationEndDate || now > event.registrationEndDate) throw httpError(409, 'Event registration has ended.');

    const activeMembers = team.members.filter((member) => member.status === 'ACTIVE');
    if (activeMembers.length < event.minTeamSize) throw httpError(409, `A minimum of ${event.minTeamSize} active team members is required.`);
    if (activeMembers.length > event.maxTeamSize) throw httpError(409, `A maximum of ${event.maxTeamSize} active team members is allowed.`);

    const activeUserIds = activeMembers.map((member) => member.userId);
    const users = await tx.user.findMany({ where: { id: { in: activeUserIds } }, select: { id: true, role: true, status: true } });
    if (users.length !== activeUserIds.length || users.some((user) => user.role !== 'STUDENT' || user.status !== 'ACTIVE')) {
      throw httpError(409, 'All active team members must be active student accounts.');
    }

    if (event.registrationCapacity !== null) {
      const occupied = await tx.eventRegistration.count({
        where: { eventId: event.id, status: { in: ['SUBMITTED', 'CONFIRMED', 'WAITLISTED'] } },
      });
      if (occupied >= event.registrationCapacity) throw httpError(409, 'This event is at registration capacity.');
    }

    const existing = await tx.eventRegistration.findUnique({
      where: { eventId_teamId: { eventId: event.id, teamId: team.id } },
    });
    if (existing) {
      if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') throw httpError(409, 'This team registration is terminal and cannot be resubmitted.');
      throw httpError(409, 'This team already has an active registration.');
    }

    try {
      const registration = await tx.eventRegistration.create({
        data: { eventId: event.id, teamId: team.id, status: 'SUBMITTED', registeredAt: now },
        select: REGISTRATION_SELECT,
      });
      await tx.registrationStatusHistory.create({
        data: { registrationId: registration.id, fromStatus: 'DRAFT', toStatus: 'SUBMITTED', changedById: userId, reason: 'Team leader submitted the registration.' },
      });
      return registration;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw httpError(409, 'This team already has a registration for the event.');
      }
      throw error;
    }
  }, { isolationLevel: 'Serializable', timeout: 10000 });
}

async function listMyRegistrations(userId, { page, limit }) {
  const where = { team: { OR: [{ leaderId: userId }, { members: { some: { userId, status: 'ACTIVE' } } }] } };
  const [registrations, total] = await Promise.all([
    prisma.eventRegistration.findMany({
      where,
      select: REGISTRATION_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eventRegistration.count({ where }),
  ]);
  return { registrations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getRegistrationForUser(registrationId, userId) {
  const registration = await prisma.eventRegistration.findUnique({ where: { id: registrationId }, select: REGISTRATION_SELECT });
  if (!registration) throw httpError(404, 'Registration not found.');
  const member = await prisma.teamMember.findFirst({ where: { teamId: registration.teamId, userId, status: 'ACTIVE' } });
  if (!member && registration.team.leaderId !== userId) throw httpError(403, 'You do not have access to this registration.');
  return registration;
}

async function cancelRegistration(userId, registrationId) {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { team: true },
    });
    if (!registration) throw httpError(404, 'Registration not found.');
    if (registration.team.leaderId !== userId) throw httpError(403, 'Only the team leader can cancel this registration.');
    if (!['SUBMITTED', 'WAITLISTED'].includes(registration.status)) throw httpError(409, `A ${registration.status} registration cannot be cancelled.`);

    await tx.registrationStatusHistory.create({
      data: { registrationId, fromStatus: registration.status, toStatus: 'CANCELLED', changedById: userId, reason: 'Cancelled by the team leader.' },
    });
    return tx.eventRegistration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED', reviewedAt: new Date() },
      select: REGISTRATION_SELECT,
    });
  });
}

async function listAdminRegistrations({ page, limit, search, eventId, status, sortBy, sortOrder }) {
  const where = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { team: { name: { contains: search, mode: 'insensitive' } } },
      { event: { title: { contains: search, mode: 'insensitive' } } },
      { team: { leader: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  const [registrations, total] = await Promise.all([
    prisma.eventRegistration.findMany({ where, select: REGISTRATION_SELECT, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
    prisma.eventRegistration.count({ where }),
  ]);
  return { registrations, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getAdminRegistration(registrationId) {
  const registration = await prisma.eventRegistration.findUnique({ where: { id: registrationId }, select: REGISTRATION_SELECT });
  if (!registration) throw httpError(404, 'Registration not found.');
  return registration;
}

async function getAdminStatistics() {
  const [total, submitted, confirmed, rejected, waitlisted, cancelled] = await Promise.all([
    prisma.eventRegistration.count(),
    prisma.eventRegistration.count({ where: { status: 'SUBMITTED' } }),
    prisma.eventRegistration.count({ where: { status: 'CONFIRMED' } }),
    prisma.eventRegistration.count({ where: { status: 'REJECTED' } }),
    prisma.eventRegistration.count({ where: { status: 'WAITLISTED' } }),
    prisma.eventRegistration.count({ where: { status: 'CANCELLED' } }),
  ]);
  return { total, submitted, confirmed, rejected, waitlisted, cancelled };
}

async function updateAdminStatus(adminId, registrationId, status, reason) {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.eventRegistration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });
    if (!registration) throw httpError(404, 'Registration not found.');

    const allowed = {
      SUBMITTED: ['CONFIRMED', 'REJECTED', 'WAITLISTED', 'CANCELLED'],
      WAITLISTED: ['CONFIRMED', 'REJECTED'],
      CONFIRMED: ['CANCELLED'],
      REJECTED: [],
      CANCELLED: [],
      DRAFT: [],
    };
    if (!allowed[registration.status]?.includes(status)) throw httpError(409, `Invalid registration transition from ${registration.status} to ${status}.`);
    if (status === 'REJECTED' && !reason) throw httpError(422, 'Rejection reason is required.');

    if (status === 'CONFIRMED') {
      await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${registration.eventId}::uuid FOR UPDATE`;
      if (registration.event.registrationCapacity !== null) {
        const occupied = await tx.eventRegistration.count({
          where: { eventId: registration.eventId, status: { in: ['SUBMITTED', 'CONFIRMED', 'WAITLISTED'] }, id: { not: registrationId } },
        });
        if (occupied >= registration.event.registrationCapacity) throw httpError(409, 'This event is at registration capacity.');
      }
    }

    await tx.registrationStatusHistory.create({
      data: {
        registrationId,
        fromStatus: registration.status,
        toStatus: status,
        changedById: adminId,
        reason: reason || (status === 'CONFIRMED' ? 'Confirmed by an administrator.' : null),
      },
    });
    return tx.eventRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: adminId,
        rejectionReason: status === 'REJECTED' ? reason : null,
      },
      select: REGISTRATION_SELECT,
    });
  }, { isolationLevel: 'Serializable', timeout: 10000 });
}

module.exports = {
  submitRegistration,
  listMyRegistrations,
  getRegistrationForUser,
  cancelRegistration,
  listAdminRegistrations,
  getAdminRegistration,
  getAdminStatistics,
  updateAdminStatus,
};
