const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashInvitation(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function getTeamSelect() {
  return {
    id: true, name: true, description: true, status: true, eventId: true, leaderId: true,
    createdAt: true, updatedAt: true,
    event: { select: { id: true, title: true, slug: true, status: true, mode: true, startDate: true, endDate: true, registrationStartDate: true, registrationEndDate: true, minTeamSize: true, maxTeamSize: true, registrationCapacity: true } },
    leader: { select: { id: true, name: true, email: true } },
    members: { select: { id: true, role: true, status: true, joinedAt: true, createdAt: true, user: { select: { id: true, name: true, email: true, status: true } } } },
    registrations: { select: { id: true, status: true, registeredAt: true, reviewedAt: true, rejectionReason: true } },
  };
}

function assertRegistrationWindow(event) {
  const now = new Date();
  if (event.status !== 'PUBLISHED') throw httpError(409, 'Teams can only be created for published events.');
  if (!event.registrationStartDate || !event.registrationEndDate) throw httpError(409, 'This event has no active registration window.');
  if (now < event.registrationStartDate) throw httpError(409, 'Event registration has not started.');
  if (now > event.registrationEndDate) throw httpError(409, 'Event registration has ended.');
}

async function listAvailableEvents(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.role !== 'STUDENT') throw httpError(403, 'Only students can discover events.');
  if (user.status !== 'ACTIVE') throw httpError(403, 'Your account must be active.');

  const now = new Date();
  return prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      registrationStartDate: { not: null, lte: now },
      registrationEndDate: { not: null, gte: now },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      description: true,
      mode: true,
      startDate: true,
      endDate: true,
      registrationStartDate: true,
      registrationEndDate: true,
      registrationCapacity: true,
      minTeamSize: true,
      maxTeamSize: true,
      venue: true,
    },
    orderBy: { startDate: 'asc' },
  });
}

async function createTeam(userId, payload) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!user || user.role !== 'STUDENT') throw httpError(403, 'Only students can create teams.');
  if (user.status !== 'ACTIVE') throw httpError(403, 'Your account must be active to create a team.');

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Event" WHERE "id" = ${payload.eventId}::uuid FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: payload.eventId } });
    if (!event) throw httpError(404, 'Event not found.');
    assertRegistrationWindow(event);

    if (event.registrationCapacity !== null) {
      const teamCount = await tx.eventRegistration.count({
        where: { eventId: event.id, status: { in: ['SUBMITTED', 'CONFIRMED', 'WAITLISTED'] } },
      });
      if (teamCount >= event.registrationCapacity) throw httpError(409, 'This event is at registration capacity.');
    }

    const existingMembership = await tx.teamMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        team: { eventId: payload.eventId, status: 'ACTIVE' },
      },
    });
    if (existingMembership) throw httpError(409, 'You already belong to an active team for this event.');

    try {
      return await tx.team.create({
        data: {
          name: payload.name,
          description: payload.description || null,
          eventId: payload.eventId,
          leaderId: userId,
          status: 'ACTIVE',
          members: {
            create: { userId, role: 'LEADER', status: 'ACTIVE', joinedAt: new Date() },
          },
        },
        select: getTeamSelect(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw httpError(409, 'A team with this name already exists for the event.');
      }
      throw error;
    }
  }, { isolationLevel: 'Serializable', timeout: 10000 });
}

async function listMyTeams(userId, { page, limit }) {
  const where = {
    status: 'ACTIVE',
    OR: [
      { leaderId: userId },
      { members: { some: { userId, status: 'ACTIVE' } } },
    ],
  };
  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: getTeamSelect(),
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.team.count({ where }),
  ]);
  return { teams, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getTeamForUser(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: getTeamSelect() });
  if (!team) throw httpError(404, 'Team not found.');
  const canView = team.leaderId === userId || team.members.some((member) => member.user.id === userId && member.status === 'ACTIVE');
  if (!canView) throw httpError(403, 'You do not have access to this team.');
  return team;
}

async function manageInvitation(teamId, userId, regenerate) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw httpError(404, 'Team not found.');
  if (team.leaderId !== userId) throw httpError(403, 'Only the team leader can manage invitations.');

  if (!regenerate) {
    await prisma.team.update({
      where: { id: teamId },
      data: { inviteCodeHash: null, inviteExpiresAt: null, inviteRevokedAt: new Date() },
    });
    return { revoked: true };
  }

  const code = crypto.randomBytes(32).toString('base64url');
  await prisma.team.update({
    where: { id: teamId },
    data: {
      inviteCodeHash: hashInvitation(code),
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      inviteRevokedAt: null,
    },
  });
  return { invitationCode: code, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}

async function joinTeam(userId, invitationCode) {
  const codeHash = hashInvitation(invitationCode);

  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findFirst({
      where: { inviteCodeHash: codeHash },
      include: { event: true, members: true },
    });
    if (!team) throw httpError(404, 'Invitation is invalid or revoked.');
    if (team.inviteRevokedAt || !team.inviteExpiresAt || team.inviteExpiresAt <= new Date()) throw httpError(409, 'Invitation is expired or revoked.');
    if (team.status !== 'ACTIVE') throw httpError(409, 'This team is no longer active.');

    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
    if (!user || user.role !== 'STUDENT') throw httpError(403, 'Only students may join teams.');
    if (user.status !== 'ACTIVE') throw httpError(403, 'Your account must be active to join a team.');

    assertRegistrationWindow(team.event);

    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${team.id}::uuid FOR UPDATE`;

    const activeCount = await tx.teamMember.count({ where: { teamId: team.id, status: 'ACTIVE' } });
    if (activeCount >= team.event.maxTeamSize) throw httpError(409, 'This team is at maximum capacity.');

    const existing = await tx.teamMember.findFirst({
      where: { userId, status: 'ACTIVE', team: { eventId: team.eventId, status: 'ACTIVE' } },
    });
    if (existing) throw httpError(409, 'You already belong to an active team for this event.');

    try {
      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw httpError(409, 'You are already a member of this team.');
      }
      throw error;
    }
    return tx.team.findUnique({ where: { id: team.id }, select: getTeamSelect() });
  }, { isolationLevel: 'Serializable', timeout: 10000 });
}

async function leaveTeam(teamId, userId) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId }, include: { members: true } });
    if (!team) throw httpError(404, 'Team not found.');
    if (team.leaderId === userId) throw httpError(409, 'The team leader cannot leave without transferring leadership.');
    const membership = team.members.find((member) => member.userId === userId && member.status === 'ACTIVE');
    if (!membership) throw httpError(404, 'Active membership not found.');
    await tx.teamMember.update({
      where: { id: membership.id },
      data: { status: 'LEFT', leftAt: new Date() },
    });
    return { left: true };
  });
}

async function removeMember(teamId, memberId, leaderId) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { id: teamId } });
    if (!team) throw httpError(404, 'Team not found.');
    if (team.leaderId !== leaderId) throw httpError(403, 'Only the team leader can remove members.');
    const member = await tx.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== teamId || member.status !== 'ACTIVE') throw httpError(404, 'Active team member not found.');
    if (member.role === 'LEADER') throw httpError(409, 'The team leader cannot be removed through this endpoint.');
    await tx.teamMember.update({ where: { id: memberId }, data: { status: 'REMOVED', leftAt: new Date() } });
    return { removed: true };
  });
}

module.exports = { createTeam, listMyTeams, getTeamForUser, manageInvitation, joinTeam, leaveTeam, removeMember, listAvailableEvents };
