const { z } = require('zod');

const eventIdSchema = z.string().uuid('Invalid event ID.');
const invitationIdSchema = z.string().uuid('Invalid invitation ID.');

const inviteEvaluatorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().trim().toLowerCase().max(255).pipe(z.string().email('Please provide a valid email address.')),
}).strict();

const listEvaluatorSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional().default(''),
  status: z.enum(['PENDING', 'REVOKED', 'EXPIRED']).optional(),
  sortBy: z.enum(['name', 'email', 'status', 'expiresAt', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

module.exports = { eventIdSchema, invitationIdSchema, inviteEvaluatorSchema, listEvaluatorSchema };
