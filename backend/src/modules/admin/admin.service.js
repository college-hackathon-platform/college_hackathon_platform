const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');
const { hashPassword } = require('../../utils/password');

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listUsers({ page, limit, search, role, status, sortBy, sortOrder }) {
  const where = {};

  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });

  if (!user) throw httpError(404, 'User not found.');
  return user;
}

async function updateUser(userId, payload) {
  await getUserById(userId);

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { name: payload.name },
      select: SAFE_USER_SELECT,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw httpError(404, 'User not found.');
    }
    throw error;
  }
}

async function updateUserStatus(userId, requestedStatus, adminUserId) {
  if (userId === adminUserId) {
    throw httpError(409, 'Administrators cannot change their own account status.');
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;

        const target = await tx.user.findUnique({
          where: { id: userId },
          select: SAFE_USER_SELECT,
        });

        if (!target) throw httpError(404, 'User not found.');
        if (target.status === requestedStatus) {
          return { user: target, changed: false };
        }

        const disablesAccount = requestedStatus === 'INACTIVE' || requestedStatus === 'SUSPENDED';
        if (disablesAccount && target.role === 'ADMIN') {
          await tx.$queryRaw`
            SELECT "id"
            FROM "User"
            WHERE "role" = 'ADMIN' AND "status" = 'ACTIVE'
            ORDER BY "id"
            FOR UPDATE
          `;

          const activeAdminCount = await tx.user.count({
            where: { role: 'ADMIN', status: 'ACTIVE' },
          });

          if (activeAdminCount <= 1) {
            throw httpError(409, 'The last active Administrator cannot be suspended or deactivated.');
          }
        }

        const now = new Date();
        const updated = await tx.user.update({
          where: { id: userId },
          data: { status: requestedStatus, updatedAt: now },
          select: SAFE_USER_SELECT,
        });

        if (disablesAccount) {
          await tx.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now },
          });
        }

        return { user: updated, changed: true };
      }, { isolationLevel: 'Serializable', timeout: 10000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  throw httpError(409, 'The account status update could not be completed because it conflicted with another change.');
}

async function createFaculty({ name, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) throw httpError(409, 'An account with this email already exists.');

  const passwordHash = await hashPassword(password);

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'FACULTY',
        status: 'ACTIVE',
      },
      select: SAFE_USER_SELECT,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw httpError(409, 'An account with this email already exists.');
    }
    throw error;
  }
}

async function getUserStatistics() {
  const [totalUsers, students, faculty, activeUsers, suspendedUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
  ]);

  return { totalUsers, students, faculty, activeUsers, suspendedUsers };
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  createFaculty,
  getUserStatistics,
};
