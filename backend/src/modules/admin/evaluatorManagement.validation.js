const { z } = require('zod');

const eventIdSchema = z.string().uuid('Invalid event ID.');
const invitationIdSchema = z.string().uuid('Invalid invitation ID.');

const inviteEvaluatorSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(255, 'Name is too long.'),
  email: z.string().trim().toLowerCase().max(255).pipe(z.string().email('Please provide a valid email address.')),
  designation: z.string().trim().min(2, 'Designation must be at least 2 characters.').max(255, 'Designation is too long.'),
  organization: z.string().trim().max(255, 'Organization is too long.').optional().or(z.literal('')),
  phone: z.union([z.literal(''), z.string().trim().max(40, 'Phone number is too long.').regex(/^[+\d][\d\s().-]{6,19}$/, 'Please provide a valid phone number.')]).optional(),
  invitationMessage: z.string().trim().max(2000, 'Invitation message is too long.').optional().or(z.literal('')),
}).strict();

const listEvaluatorSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional().default(''),
  status: z.enum(['PENDING', 'REVOKED', 'EXPIRED']).optional(),
  emailDeliveryStatus: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  sortBy: z.enum(['name', 'email', 'designation', 'status', 'emailDeliveryStatus', 'expiresAt', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

module.exports = { eventIdSchema, invitationIdSchema, inviteEvaluatorSchema, listEvaluatorSchema };
