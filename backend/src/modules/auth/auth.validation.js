const { z } = require('zod');

const normalizeEmail = (value) => String(value).trim().toLowerCase();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long.').max(100, 'Name is too long.'),
  email: z.string().transform(normalizeEmail).pipe(z.string().email('Please provide a valid email address.')),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128, 'Password is too long.'),
}).strict();

const loginSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.string().email('Please provide a valid email address.')),
  password: z.string().min(8, 'Password must be at least 8 characters long.').max(128, 'Password is too long.'),
}).strict();

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Refresh token is missing or invalid.').optional(),
}).strict();

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  normalizeEmail,
};
