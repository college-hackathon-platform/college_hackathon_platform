const prisma = require('../../config/database');

async function listTeams({ page, limit, search, eventId, status, sortBy, sortOrder }) {
  const where = {};
  if (eventId) where.eventId = eventId;
  if (status) where.status = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      select: {
        id: true, name: true, description: true, status: true, eventId: true, leaderId: true, createdAt: true,
        event: { select: { id: true, title: true, slug: true } },
        leader: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, status: true } },
        registrations: { select: { id: true, status: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.team.count({ where }),
  ]);
  return { teams, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getTeam(teamId) {
  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      event: true,
      leader: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, status: true } } } },
      registrations: { include: { history: true, reviewedBy: { select: { id: true, name: true } } } },
    },
  });
}

async function teamStatistics() {
  const [totalTeams, activeTeams, totalMembers, registrations] = await Promise.all([
    prisma.team.count(),
    prisma.team.count({ where: { status: 'ACTIVE' } }),
    prisma.teamMember.count({ where: { status: 'ACTIVE' } }),
    prisma.eventRegistration.count(),
  ]);
  return { totalTeams, activeTeams, totalMembers, registrations };
}

module.exports = { listTeams, getTeam, teamStatistics };
