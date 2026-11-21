const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

const INVITATION_DAYS = 7;

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSecret() {
  return crypto.randomBytes(32).toString('base64url');
}

async function expirePending() {
  await prisma.eventEvaluatorInvitation.updateMany({
    where: { status: 'PENDING', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
}

async function listEvaluators(eventId, payload) {
  await expirePending();
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw httpError(404, 'Event not found.');

  const where = { eventId };
  if (payload.status) where.status = payload.status;
  if (payload.search) {
    where.OR = [
      { name: { contains: payload.search, mode: 'insensitive' } },
      { email: { contains: payload.search, mode: 'insensitive' } },
    ];
  }

  const [invitations, total] = await Promise.all([
    prisma.eventEvaluatorInvitation.findMany({
      where,
      select: {
        id: true, name: true, email: true, status: true, expiresAt: true, revokedAt: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { [payload.sortBy]: payload.sortOrder },
      skip: (payload.page - 1) * payload.limit,
      take: payload.limit,
    }),
    prisma.eventEvaluatorInvitation.count({ where }),
  ]);

  return { invitations, pagination: { page: payload.page, limit: payload.limit, total, totalPages: Math.ceil(total / payload.limit) } };
}

async function inviteEvaluator(eventId, payload, createdById) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true } });
  if (!event) throw httpError(404, 'Event not found.');

  const existing = await prisma.eventEvaluatorInvitation.findFirst({
    where: { eventId, email: payload.email, status: 'PENDING', expiresAt: { gt: new Date() } },
  });
  if (existing) throw httpError(409, 'A pending evaluator invitation already exists for this email.');

  const secret = createSecret();
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const invitation = await prisma.eventEvaluatorInvitation.create({
      data: {
        eventId,
        name: payload.name,
        email: payload.email,
        tokenHash: hashToken(secret),
        status: 'PENDING',
        expiresAt,
        createdById,
      },
      select: { id: true, name: true, email: true, status: true, expiresAt: true, createdAt: true, updatedAt: true },
    });
    return {
      invitation,
      invitationSecret: secret,
      copyableLink: `/evaluator/invitations/${secret}`,
      emailDeliveryConfigured: false,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw httpError(409, 'A pending evaluator invitation already exists for this email.');
    }
    throw error;
  }
}

async function revokeInvitation(invitationId) {
  const invitation = await prisma.eventEvaluatorInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation) throw httpError(404, 'Evaluator invitation not found.');
  if (invitation.status !== 'PENDING') throw httpError(409, 'Only pending invitations can be revoked.');
  const updated = await prisma.eventEvaluatorInvitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED', revokedAt: new Date() },
    select: { id: true, name: true, email: true, status: true, expiresAt: true, revokedAt: true, createdAt: true, updatedAt: true },
  });
  return updated;
}

async function regenerateInvitation(invitationId, createdById) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.eventEvaluatorInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw httpError(404, 'Evaluator invitation not found.');
    if (invitation.status !== 'PENDING') throw httpError(409, 'Only pending invitations can be regenerated.');

    await tx.eventEvaluatorInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    const secret = createSecret();
    const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
    const regenerated = await tx.eventEvaluatorInvitation.create({
      data: {
        eventId: invitation.eventId,
        name: invitation.name,
        email: invitation.email,
        tokenHash: hashToken(secret),
        status: 'PENDING',
        expiresAt,
        createdById,
      },
      select: { id: true, name: true, email: true, status: true, expiresAt: true, createdAt: true, updatedAt: true },
    });
    return {
      invitation: regenerated,
      invitationSecret: secret,
      copyableLink: `/evaluator/invitations/${secret}`,
      emailDeliveryConfigured: false,
    };
  });
}

module.exports = { listEvaluators, inviteEvaluator, revokeInvitation, regenerateInvitation };
