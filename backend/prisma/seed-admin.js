require('dotenv').config();

const prisma = require('../src/config/database');
const { normalizeEmail } = require('../src/modules/auth/auth.service');
const { hashPassword } = require('../src/utils/password');

const requiredVariables = [
  'INITIAL_ADMIN_NAME',
  'INITIAL_ADMIN_EMAIL',
  'INITIAL_ADMIN_PASSWORD',
];

async function seedInitialAdmin() {
  const missingVariables = requiredVariables.filter((name) => {
    return typeof process.env[name] !== 'string' || process.env[name].trim() === '';
  });

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }

  const name = process.env.INITIAL_ADMIN_NAME.trim();
  const email = normalizeEmail(process.env.INITIAL_ADMIN_EMAIL);
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!name) {
    throw new Error('INITIAL_ADMIN_NAME must not be empty.');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(79651682103425) IS NULL AS acquired`;

      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return 'email-exists';
      }

      const existingAdmin = await tx.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (existingAdmin) {
        return 'admin-exists';
      }

      const passwordHash = await hashPassword(password);

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      return 'created';
    });

    if (result === 'email-exists') {
      console.log('An account with the configured initial Admin email already exists. No changes were made.');
    } else if (result === 'admin-exists') {
      console.log('An Admin account already exists. Initial Admin setup was not repeated.');
    } else {
      console.log('Initial Admin account created successfully.');
    }
  } catch (error) {
    if (error && error.code === 'P2002') {
      console.log('An account with the configured email already exists. No changes were made.');
      return;
    }

    throw error;
  }
}

seedInitialAdmin()
  .catch((error) => {
    console.error(`Admin initialization failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
