const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

const EVENT_SELECT = {
  id: true,
  title: true,
  slug: true,
  shortDescription: true,
  description: true,
  status: true,
  mode: true,
  startDate: true,
  endDate: true,
  registrationStartDate: true,
  registrationEndDate: true,
  venue: true,
  registrationCapacity: true,
  minTeamSize: true,
  maxTeamSize: true,
  eligibility: true,
  rules: true,
  createdById: true,
  publishedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true, role: true } },
};

function httpError(statusCode, message, fieldErrors = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (fieldErrors) error.errors = fieldErrors;
  return error;
}

function slugify(value) {
  const normalized = String(value).trim().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (normalized || 'event').slice(0, 220);
}

function candidateSlug(baseSlug, suffix = null) {
  if (!suffix) return baseSlug;
  const suffixText = `-${suffix}`;
  return `${baseSlug.slice(0, 220 - suffixText.length).replace(/-+$/, '')}${suffixText}`;
}

async function findAvailableSlug(title) {
  const baseSlug = slugify(title);

  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = candidateSlug(baseSlug, suffix === 1 ? null : suffix);
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `${candidateSlug(baseSlug, Date.now()).slice(0, 220)}`;
}

function validateTimeline(event) {
  if (event.minTeamSize > event.maxTeamSize) {
    throw httpError(422, 'Minimum team size cannot exceed maximum team size.', {
      minTeamSize: 'Minimum team size cannot exceed maximum team size.',
    });
  }
  if (event.registrationCapacity !== null && event.registrationCapacity !== undefined && event.registrationCapacity <= 0) {
    throw httpError(422, 'Registration capacity must be a positive integer.', {
      registrationCapacity: 'Registration capacity must be a positive integer.',
    });
  }

  const dates = [
    event.startDate,
    event.endDate,
    event.registrationStartDate,
    event.registrationEndDate,
  ].filter(Boolean);
  if (dates.some((date) => Number.isNaN(date.getTime()))) {
    throw httpError(422, 'A valid ISO 8601 date is required.');
  }
  if (event.startDate && event.endDate && event.endDate <= event.startDate) {
    throw httpError(422, 'Event end date must be after event start date.', {
      endDate: 'Event end date must be after event start date.',
    });
  }
  if (event.registrationStartDate && event.registrationEndDate && event.registrationEndDate <= event.registrationStartDate) {
    throw httpError(422, 'Registration end date must be after registration start date.', {
      registrationEndDate: 'Registration end date must be after registration start date.',
    });
  }
  if (event.registrationEndDate && event.startDate && event.registrationEndDate > event.startDate) {
    throw httpError(422, 'Registration must end before or at the event start date.', {
      registrationEndDate: 'Registration must end before or at the event start date.',
    });
  }
  if ((event.mode === 'OFFLINE' || event.mode === 'HYBRID') && !event.venue?.trim()) {
    throw httpError(422, 'A venue is required for OFFLINE and HYBRID events.', {
      venue: 'A venue is required for OFFLINE and HYBRID events.',
    });
  }
  if (event.mode === 'ONLINE' && event.venue === undefined) {
    event.venue = null;
  }
}

function validatePublishReady(event) {
  if (!event.title?.trim() || !event.slug?.trim() || !event.description?.trim()) {
    throw httpError(422, 'Title, slug, and description are required before publishing.');
  }
  if (!event.startDate || !event.endDate || !event.registrationStartDate || !event.registrationEndDate) {
    throw httpError(422, 'Event and registration dates are required before publishing.');
  }
  validateTimeline(event);
}

async function createEvent(payload, adminUserId) {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: 'default' },
    select: { allowEventCreation: true },
  });
  if (settings && !settings.allowEventCreation) {
    throw httpError(409, 'Global event creation is currently disabled.');
  }
  const data = { ...payload, createdById: adminUserId, status: 'DRAFT' };
  validateTimeline(data);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = await findAvailableSlug(payload.title);
    try {
      return await prisma.event.create({
        data: { ...data, slug },
        select: EVENT_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      throw error;
    }
  }

  throw httpError(409, 'Could not generate a unique event slug. Please try again.');
}

async function listEvents({ page, limit, search, status, mode, sortBy, sortOrder }) {
  const where = {};
  if (status) where.status = status;
  if (mode) where.mode = mode;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getEventById(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: EVENT_SELECT });
  if (!event) throw httpError(404, 'Event not found.');
  return event;
}

async function updateEvent(eventId, payload) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw httpError(404, 'Event not found.');
  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw httpError(409, 'Completed and cancelled events cannot be edited.');
  }

  const resulting = { ...existing, ...payload };
  validateTimeline(resulting);

  try {
    return await prisma.event.update({
      where: { id: eventId },
      data: payload,
      select: EVENT_SELECT,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw httpError(409, 'An event with this slug already exists.');
      if (error.code === 'P2025') throw httpError(404, 'Event not found.');
    }
    throw error;
  }
}

async function updateEventStatus(eventId, requestedStatus) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw httpError(404, 'Event not found.');

    const allowed = {
      DRAFT: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['REGISTRATION_CLOSED', 'CANCELLED'],
      REGISTRATION_CLOSED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!allowed[event.status]?.includes(requestedStatus) || requestedStatus === event.status) {
      throw httpError(409, `Invalid status transition from ${event.status} to ${requestedStatus}.`);
    }

    if (requestedStatus === 'PUBLISHED') validatePublishReady(event);

    const now = new Date();
    const data = { status: requestedStatus };
    if (requestedStatus === 'PUBLISHED') data.publishedAt = now;
    if (requestedStatus === 'CANCELLED') data.cancelledAt = now;

    return tx.event.update({ where: { id: eventId }, data, select: EVENT_SELECT });
  });
}

async function getEventStatistics() {
  const [total, draft, published, registrationClosed, completed, cancelled] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: 'DRAFT' } }),
    prisma.event.count({ where: { status: 'PUBLISHED' } }),
    prisma.event.count({ where: { status: 'REGISTRATION_CLOSED' } }),
    prisma.event.count({ where: { status: 'COMPLETED' } }),
    prisma.event.count({ where: { status: 'CANCELLED' } }),
  ]);

  return { total, draft, published, registrationClosed, completed, cancelled };
}

module.exports = {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  getEventStatistics,
};
