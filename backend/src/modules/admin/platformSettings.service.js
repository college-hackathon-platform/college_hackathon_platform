const prisma = require('../../config/database');

const SETTINGS_ID = 'default';

async function getSettings() {
  return prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

async function updateSettings(payload) {
  return prisma.platformSettings.update({
    where: { id: SETTINGS_ID },
    data: payload,
  });
}

async function getPublicPlatformStatus() {
  const settings = await getSettings();
  return {
    platformName: settings.platformName,
    platformDescription: settings.platformDescription,
    platformStatus: settings.platformStatus,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMode ? settings.maintenanceMessage : '',
  };
}

module.exports = { getSettings, updateSettings, getPublicPlatformStatus };
