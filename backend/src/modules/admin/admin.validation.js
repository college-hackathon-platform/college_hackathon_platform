const { z } = require('zod');

const roles = z.enum(['ADMIN', 'FACULTY', 'STUDENT']);
const statuses = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
  role: roles.optional(),
  status: statuses.optional(),
  sortBy: z.enum(['name', 'email', 'role', 'status', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

const userIdSchema = z.string().uuid('Invalid user ID.');

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.').max(100, 'Name is too long.'),
}).strict();

const updateStatusSchema = z.object({
  status: statuses,
}).strict();

const createFacultySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.').max(100, 'Name is too long.'),
  email: z.string().transform((value) => String(value).trim().toLowerCase()).pipe(z.string().email('Please provide a valid email address.')),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128, 'Password is too long.'),
}).strict();

module.exports = {
  listUsersSchema,
  userIdSchema,
  updateUserSchema,
  updateStatusSchema,
  createFacultySchema,
};
