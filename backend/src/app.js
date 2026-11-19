const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const prisma = require('./config/database');
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const facultyRoutes = require('./modules/faculty/faculty.routes');
const studentRoutes = require('./modules/student/student.routes');
const teamRoutes = require('./modules/team/team.routes');
const registrationRoutes = require('./modules/registration/registration.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const allowedOrigin = String(process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, '');

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token', 'Origin'],
  }),
);
app.use(express.json());
app.use(cookieParser());

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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/faculty', facultyRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/registrations', registrationRoutes);

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

app.use(errorHandler);

module.exports = app;
