const { z } = require('zod');

const facultyIdSchema = z.string().uuid('Invalid faculty ID.');
const eventIdSchema = z.string().uuid('Invalid event ID.');

const listFacultySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  sortBy: z.enum(['name', 'email', 'status', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
}).strict();

const assignFacultySchema = z.object({
  facultyId: z.string().uuid('Invalid faculty ID.'),
}).strict();

module.exports = { facultyIdSchema, eventIdSchema, listFacultySchema, assignFacultySchema };
