const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const prisma = require('./config/database');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use(express.json());

app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Backend is running successfully',
      services: {
        api: 'operational',
        database: 'connected',
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable',
      services: {
        api: 'operational',
        database: 'unavailable',
      },
    });
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled request error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

module.exports = app;
