const prisma = require('../config/database');

async function maintenanceMode(req, res, next) {
  try {
    const path = req.path || '';
    const isAdminApi = path === '/admin' || path.startsWith('/admin/');
    const isAuthApi = path === '/auth' || path.startsWith('/auth/');
    const isHealthApi = path === '/health';
    const isPlatformStatusApi = path === '/platform/status';

    if (isAdminApi || isAuthApi || isHealthApi || isPlatformStatusApi) return next();

    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'default' },
      select: { maintenanceMode: true, maintenanceMessage: true },
    });

    if (settings?.maintenanceMode) {
      return res.status(503).json({
        success: false,
        message: 'The platform is currently under maintenance.',
        maintenance: true,
        maintenanceMessage: settings.maintenanceMessage,
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = maintenanceMode;
