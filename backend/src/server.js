require('dotenv').config();

const { validateAuthConfig } = require('./config/env');
const app = require('./app');
const prisma = require('./config/database');

validateAuthConfig();

const port = Number(process.env.PORT || 5000);
let server;
let shuttingDown = false;

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[redacted]');
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await prisma.$disconnect();
    console.log('PostgreSQL disconnected successfully.');
  } catch (error) {
    console.error('Graceful shutdown failed:', safeErrorMessage(error));
    process.exitCode = 1;
  }
}

async function startServer() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected successfully.');

    server = app.listen(port);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    console.log(`Server running on port ${port}.`);
    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (error) {
    console.error('Backend startup failed:', safeErrorMessage(error));
    if (server) {
      server.close();
    }

    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Prisma disconnect failed:', safeErrorMessage(disconnectError));
    }
    process.exitCode = 1;
  }
}

void startServer();
