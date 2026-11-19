const { z } = require('zod');

const teamIdSchema = z.string().uuid('Invalid team ID.');
const memberIdSchema = z.string().uuid('Invalid member ID.');

const createTeamSchema = z.object({
  eventId: z.string().uuid('Invalid event ID.'),
  name: z.string().trim().min(2, 'Team name must be at least 2 characters.').max(120, 'Team name is too long.'),
  description: z.string().trim().max(2000, 'Description is too long.').optional().nullable(),
}).strict();

const joinTeamSchema = z.object({
  invitationCode: z.string().trim().min(20, 'Invalid invitation code.').max(128, 'Invalid invitation code.'),
}).strict();

const listMyTeamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

module.exports = { teamIdSchema, memberIdSchema, createTeamSchema, joinTeamSchema, listMyTeamsSchema };
