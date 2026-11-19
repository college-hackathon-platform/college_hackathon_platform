const { z } = require('zod');

const submitRegistrationSchema = z.object({
  teamId: z.string().uuid('Invalid team ID.'),
}).strict();

const registrationIdSchema = z.string().uuid('Invalid registration ID.');

const adminStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'REJECTED', 'WAITLISTED', 'CANCELLED']),
  reason: z.string().trim().min(3, 'A rejection reason must be at least 3 characters.').max(2000).optional(),
}).strict().superRefine((value, context) => {
  if (value.status === 'REJECTED' && !value.reason) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Rejection reason is required.' });
  }
});

const listRegistrationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
  eventId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITLISTED']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'registeredAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

module.exports = { submitRegistrationSchema, registrationIdSchema, adminStatusSchema, listRegistrationsSchema };
