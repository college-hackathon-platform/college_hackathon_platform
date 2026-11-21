const platformSettingsService = require('./platformSettings.service');
const { updatePlatformSettingsSchema } = require('./platformSettings.validation');

function zodError(res, error) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || 'Invalid platform settings.',
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function getSettings(req, res, next) {
  try {
    const settings = await platformSettingsService.getSettings();
    return res.status(200).json({ success: true, message: 'Platform settings retrieved successfully.', data: { settings } });
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const payload = updatePlatformSettingsSchema.parse(req.body);
    const settings = await platformSettingsService.updateSettings(payload);
    return res.status(200).json({ success: true, message: 'Platform settings updated successfully.', data: { settings } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getPublicStatus(req, res, next) {
  try {
    const status = await platformSettingsService.getPublicPlatformStatus();
    return res.status(200).json({ success: true, message: 'Platform status retrieved successfully.', data: { status } });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getSettings, updateSettings, getPublicStatus };
