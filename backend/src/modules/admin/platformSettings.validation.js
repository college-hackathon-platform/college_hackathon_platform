const { z } = require('zod');

const updatePlatformSettingsSchema = z.object({
  platformName: z.string().trim().min(2).max(180).optional(),
  platformDescription: z.string().trim().max(1000).optional(),
  supportEmail: z.string().trim().max(255).refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Please provide a valid support email.').optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  platformStatus: z.enum(['ONLINE', 'DEGRADED', 'MAINTENANCE']).optional(),
  allowEventCreation: z.boolean().optional(),
  registrationEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().min(1).max(1000).optional(),
}).strict().refine((payload) => Object.keys(payload).length > 0, 'At least one setting must be provided.');

module.exports = { updatePlatformSettingsSchema };
