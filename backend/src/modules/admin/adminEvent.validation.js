const { z } = require('zod');

const eventStatuses = z.enum(['DRAFT', 'PUBLISHED', 'REGISTRATION_CLOSED', 'COMPLETED', 'CANCELLED']);
const eventModes = z.enum(['ONLINE', 'OFFLINE', 'HYBRID']);

const nullableDate = z.union([
  z.string().datetime({ offset: true, message: 'Date must be a valid ISO 8601 date.' }),
  z.literal(null),
  z.literal(''),
]).optional().transform((value) => {
  if (!value || value === '') return null;
  return new Date(value);
}).refine((value) => value === null || !Number.isNaN(value.getTime()), 'Date must be valid.');

const slugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphen-separated words.')
  .min(3, 'Slug must be at least 3 characters.')
  .max(220, 'Slug is too long.');

const createEventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(180, 'Title is too long.'),
  slug: slugSchema.optional(),
  shortDescription: z.string().trim().max(300, 'Short description is too long.').optional().default(''),
  description: z.string().trim().max(10000, 'Description is too long.').optional().default(''),
  mode: eventModes.optional().default('ONLINE'),
  startDate: nullableDate,
  endDate: nullableDate,
  registrationStartDate: nullableDate,
  registrationEndDate: nullableDate,
  venue: z.string().trim().max(255, 'Venue is too long.').optional().nullable(),
  registrationCapacity: z.number().int().positive('Registration capacity must be a positive integer.').optional().nullable(),
  minTeamSize: z.number().int().positive('Minimum team size must be positive.').optional().default(1),
  maxTeamSize: z.number().int().positive('Maximum team size must be positive.').optional().default(1),
  eligibility: z.string().trim().max(1000, 'Eligibility is too long.').optional().nullable(),
  rules: z.string().trim().max(10000, 'Rules are too long.').optional().nullable(),
}).strict();

const updateEventSchema = z.object({
  title: z.string().trim().min(3).max(180).optional(),
  slug: slugSchema.optional(),
  shortDescription: z.string().trim().max(300).optional(),
  description: z.string().trim().max(10000).optional(),
  mode: eventModes.optional(),
  startDate: nullableDate,
  endDate: nullableDate,
  registrationStartDate: nullableDate,
  registrationEndDate: nullableDate,
  venue: z.string().trim().max(255).optional().nullable(),
  registrationCapacity: z.number().int().positive().optional().nullable(),
  minTeamSize: z.number().int().positive().optional(),
  maxTeamSize: z.number().int().positive().optional(),
  eligibility: z.string().trim().max(1000).optional().nullable(),
  rules: z.string().trim().max(10000).optional().nullable(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const listEventsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional().default(''),
  status: eventStatuses.optional(),
  mode: eventModes.optional(),
  sortBy: z.enum(['title', 'slug', 'status', 'mode', 'startDate', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

const updateEventStatusSchema = z.object({
  status: eventStatuses,
}).strict();

const eventIdSchema = z.string().uuid('Invalid event ID.');

module.exports = {
  createEventSchema,
  updateEventSchema,
  listEventsSchema,
  updateEventStatusSchema,
  eventIdSchema,
};
