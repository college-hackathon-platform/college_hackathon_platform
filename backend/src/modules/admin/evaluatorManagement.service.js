const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');
const mailService = require('../../services/mailService');
const { getMailConfig } = require('../../config/env');

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
  if (payload.emailDeliveryStatus) where.emailDeliveryStatus = payload.emailDeliveryStatus;
  if (payload.search) {
    where.OR = [
      { name: { contains: payload.search, mode: 'insensitive' } },
      { email: { contains: payload.search, mode: 'insensitive' } },
      { designation: { contains: payload.search, mode: 'insensitive' } },
      { organization: { contains: payload.search, mode: 'insensitive' } },
    ];
  }

  const [invitations, total] = await Promise.all([
    prisma.eventEvaluatorInvitation.findMany({
      where,
      select: {
        id: true, name: true, email: true, designation: true, organization: true, phone: true,
        invitationMessage: true, status: true, emailDeliveryStatus: true, emailDeliveryError: true,
        emailedAt: true, expiresAt: true, revokedAt: true, createdAt: true, updatedAt: true,
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
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, description: true, shortDescription: true, mode: true, startDate: true, endDate: true, venue: true },
  });
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
        designation: payload.designation,
        organization: payload.organization || null,
        phone: payload.phone || null,
        invitationMessage: payload.invitationMessage || null,
        tokenHash: hashToken(secret),
        status: 'PENDING',
        emailDeliveryStatus: 'PENDING',
        expiresAt,
        createdById,
      },
      select: { id: true, name: true, email: true, designation: true, organization: true, phone: true, status: true, emailDeliveryStatus: true, emailDeliveryError: true, emailedAt: true, expiresAt: true, createdAt: true, updatedAt: true },
    });
    return deliverInvitation(invitation, event, secret);
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

async function deliverInvitation(invitation, event, secret) {
  const config = getMailConfig();
  let delivered = false;

  if (!config.configured) {
    await prisma.eventEvaluatorInvitation.update({
      where: { id: invitation.id },
      data: { emailDeliveryStatus: 'FAILED', emailDeliveryError: 'SMTP configuration is incomplete.' },
    });
  } else {
    try {
      await mailService.sendEvaluatorInvitation({
        evaluatorName: invitation.name,
        evaluatorEmail: invitation.email,
        event,
        designation: invitation.designation,
        organization: invitation.organization,
        invitationMessage: invitation.invitationMessage,
        expiresAt: invitation.expiresAt,
        invitationToken: secret,
      });
      delivered = true;
      await prisma.eventEvaluatorInvitation.update({
        where: { id: invitation.id },
        data: { emailDeliveryStatus: 'SENT', emailDeliveryError: null, emailedAt: new Date() },
      });
    } catch (error) {
      const category = error?.code ? `SMTP error (${error.code})` : 'Email delivery failed';
      await prisma.eventEvaluatorInvitation.update({
        where: { id: invitation.id },
        data: { emailDeliveryStatus: 'FAILED', emailDeliveryError: category.slice(0, 500) },
      });
    }
  }

  const updated = await prisma.eventEvaluatorInvitation.findUnique({
    where: { id: invitation.id },
    select: { id: true, name: true, email: true, designation: true, organization: true, phone: true, status: true, emailDeliveryStatus: true, emailDeliveryError: true, emailedAt: true, expiresAt: true, createdAt: true, updatedAt: true },
  });

  return {
    invitation: updated,
    invitationSecret: secret,
    copyableLink: `/evaluator/invitations/${secret}`,
    emailDelivered: delivered,
  };
}

async function regenerateInvitation(invitationId, createdById) {
  const invitation = await prisma.eventEvaluatorInvitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });
  if (!invitation) throw httpError(404, 'Evaluator invitation not found.');
  if (invitation.status !== 'PENDING') throw httpError(409, 'Only pending invitations can be regenerated.');

  const secret = createSecret();
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
  const regenerated = await prisma.eventEvaluatorInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash: hashToken(secret),
      expiresAt,
      revokedAt: null,
      emailDeliveryStatus: 'PENDING',
      emailDeliveryError: null,
      createdById,
    },
  });
  return deliverInvitation(regenerated, invitation.event, secret);
}

async function resendInvitation(invitationId) {
  const invitation = await prisma.eventEvaluatorInvitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });
  if (!invitation) throw httpError(404, 'Evaluator invitation not found.');
  if (invitation.status !== 'PENDING') throw httpError(409, 'Only pending invitations can be resent.');
  if (invitation.expiresAt <= new Date()) throw httpError(409, 'This invitation has expired. Regenerate it before resending.');

  const secret = createSecret();
  const updated = await prisma.eventEvaluatorInvitation.update({
    where: { id: invitationId },
    data: { tokenHash: hashToken(secret), emailDeliveryStatus: 'PENDING', emailDeliveryError: null },
  });
  return deliverInvitation(updated, invitation.event, secret);
}

async function getInvitationByToken(token) {
  if (!token || token.length < 32) throw httpError(404, 'Invalid evaluator invitation.');
  await expirePending();
  const invitation = await prisma.eventEvaluatorInvitation.findFirst({
    where: { tokenHash: hashToken(token) },
    include: { event: { select: { id: true, title: true, description: true, shortDescription: true, mode: true, startDate: true, endDate: true, venue: true } } },
  });
  if (!invitation) throw httpError(404, 'Invalid evaluator invitation.');
  if (invitation.status === 'REVOKED') throw httpError(410, 'This evaluator invitation has been revoked.');
  if (invitation.status === 'EXPIRED' || invitation.expiresAt <= new Date()) throw httpError(410, 'This evaluator invitation has expired.');

  return {
    invitation: {
      name: invitation.name,
      email: invitation.email,
      designation: invitation.designation,
      organization: invitation.organization,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      invitationMessage: invitation.invitationMessage,
      event: invitation.event,
    },
  };
}

module.exports = { listEvaluators, inviteEvaluator, revokeInvitation, regenerateInvitation, resendInvitation, getInvitationByToken };
