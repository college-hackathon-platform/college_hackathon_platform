const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listFaculty({ page, limit, search, status, sortBy, sortOrder }) {
  const where = { role: 'FACULTY' };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [faculty, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
        facultyAssignments: {
          select: { id: true, assignedAt: true, event: { select: { id: true, title: true, slug: true, status: true } } },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    faculty: faculty.map((member) => ({
      ...member,
      assignmentCount: member.facultyAssignments.length,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getFaculty(facultyId) {
  const faculty = await prisma.user.findUnique({
    where: { id: facultyId },
    select: {
      id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true,
      facultyAssignments: {
        select: { id: true, assignedAt: true, event: { select: { id: true, title: true, slug: true, status: true, startDate: true, endDate: true } } },
      },
    },
  });
  if (!faculty || faculty.role !== 'FACULTY') throw httpError(404, 'Faculty member not found.');
  return { ...faculty, assignmentCount: faculty.facultyAssignments.length };
}

async function assignFaculty(eventId, facultyId, assignedById) {
  return prisma.$transaction(async (tx) => {
    const [event, faculty] = await Promise.all([
      tx.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true } }),
      tx.user.findUnique({ where: { id: facultyId }, select: { id: true, name: true, email: true, role: true, status: true } }),
    ]);
    if (!event) throw httpError(404, 'Event not found.');
    if (event.status === 'CANCELLED') throw httpError(409, 'Faculty cannot be assigned to a cancelled event.');
    if (event.status === 'COMPLETED') throw httpError(409, 'Faculty cannot be assigned to a completed event.');
    if (!faculty || faculty.role !== 'FACULTY') throw httpError(404, 'Faculty member not found.');
    if (faculty.status !== 'ACTIVE') throw httpError(409, 'Only active Faculty accounts can be assigned.');

    try {
      return await tx.eventFacultyAssignment.create({
        data: { eventId, facultyId, assignedById },
        select: {
          id: true, assignedAt: true,
          event: { select: { id: true, title: true, slug: true } },
          faculty: { select: { id: true, name: true, email: true, status: true } },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw httpError(409, 'This Faculty member is already assigned to the event.');
      }
      throw error;
    }
  });
}

async function removeAssignment(eventId, facultyId) {
  const [assignment, event] = await Promise.all([
    prisma.eventFacultyAssignment.findUnique({
      where: { eventId_facultyId: { eventId, facultyId } },
    }),
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, status: true } }),
  ]);
  if (!assignment) throw httpError(404, 'Faculty assignment not found.');
  if (event && (event.status === 'COMPLETED' || event.status === 'CANCELLED')) {
    throw httpError(409, `Cannot modify faculty assignments for a ${event.status.toLowerCase()} event.`);
  }
  await prisma.eventFacultyAssignment.delete({
    where: { eventId_facultyId: { eventId, facultyId } },
  });
  return { removed: true };
}

module.exports = { listFaculty, getFaculty, assignFaculty, removeAssignment };
