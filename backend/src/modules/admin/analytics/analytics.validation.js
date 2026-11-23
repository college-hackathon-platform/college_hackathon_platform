const { z } = require('zod');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDateOnly(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const analyticsDateRangeSchema = z.object({
  startDate: z.string().trim().refine(validDateOnly, 'startDate must be a valid YYYY-MM-DD date.').optional(),
  endDate: z.string().trim().refine(validDateOnly, 'endDate must be a valid YYYY-MM-DD date.').optional(),
  eventId: z.string().uuid('Invalid event ID.').optional(),
  userRole: z.enum(['ADMIN', 'FACULTY', 'STUDENT']).optional(),
  status: z.enum([
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'DRAFT',
    'PUBLISHED',
    'REGISTRATION_CLOSED',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED',
    'DISBANDED',
    'LEFT',
    'REMOVED',
    'SUBMITTED',
    'CONFIRMED',
    'REJECTED',
    'WAITLISTED',
    'PENDING',
    'REVOKED',
    'EXPIRED',
    'SENT',
    'FAILED',
  ]).optional(),
  interval: z.enum(['DAY', 'WEEK', 'MONTH']).default('MONTH'),
}).strict().superRefine((payload, context) => {
  if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['startDate'],
      message: 'startDate cannot be later than endDate.',
    });
  }
});

const REPORT_TYPES = [
  'PLATFORM_OVERVIEW',
  'USER_ANALYTICS',
  'EVENT_ANALYTICS',
  'TEAM_ANALYTICS',
  'REGISTRATION_ANALYTICS',
  'PARTICIPATION_ANALYTICS',
];

const EXPORT_FORMATS = ['CSV', 'XLSX', 'PDF'];

const reportPreviewSchema = z.object({
  reportType: z.enum(REPORT_TYPES, {
    errorMap: () => ({ message: `reportType must be one of: ${REPORT_TYPES.join(', ')}` }),
  }),
  startDate: z.string().trim().refine(validDateOnly, 'startDate must be a valid YYYY-MM-DD date.').optional(),
  endDate: z.string().trim().refine(validDateOnly, 'endDate must be a valid YYYY-MM-DD date.').optional(),
  eventId: z.string().uuid('Invalid event ID.').optional(),
  interval: z.enum(['DAY', 'WEEK', 'MONTH']).default('MONTH'),
}).strict().superRefine((payload, context) => {
  if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['startDate'],
      message: 'startDate cannot be later than endDate.',
    });
  }
});

const reportExportSchema = z.object({
  reportType: z.enum(REPORT_TYPES, {
    errorMap: () => ({ message: `reportType must be one of: ${REPORT_TYPES.join(', ')}` }),
  }),
  format: z.enum(EXPORT_FORMATS, {
    errorMap: () => ({ message: `format must be one of: ${EXPORT_FORMATS.join(', ')}` }),
  }),
  startDate: z.string().trim().refine(validDateOnly, 'startDate must be a valid YYYY-MM-DD date.').optional(),
  endDate: z.string().trim().refine(validDateOnly, 'endDate must be a valid YYYY-MM-DD date.').optional(),
  eventId: z.string().uuid('Invalid event ID.').optional(),
  interval: z.enum(['DAY', 'WEEK', 'MONTH']).default('MONTH'),
}).strict().superRefine((payload, context) => {
  if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
    context.addIssue({
      code: 'custom',
      path: ['startDate'],
      message: 'startDate cannot be later than endDate.',
    });
  }
});

module.exports = {
  analyticsDateRangeSchema,
  validDateOnly,
  reportPreviewSchema,
  reportExportSchema,
  REPORT_TYPES,
  EXPORT_FORMATS,
};
