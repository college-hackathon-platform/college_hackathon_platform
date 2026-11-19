const {
  submitRegistrationSchema,
  registrationIdSchema,
  adminStatusSchema,
  listRegistrationsSchema,
} = require('./registration.validation');
const registrationService = require('./registration.service');

function zodError(res, error, fallback) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallback,
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function submit(req, res, next) {
  try {
    const payload = submitRegistrationSchema.parse(req.body);
    const registration = await registrationService.submitRegistration(req.user.id, payload.teamId);
    return res.status(201).json({ success: true, message: 'Registration submitted successfully.', data: { registration } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration data.');
    return next(error);
  }
}

async function listMy(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const result = await registrationService.listMyRegistrations(req.user.id, { page, limit });
    return res.status(200).json({ success: true, message: 'Registrations retrieved successfully.', data: result });
  } catch (error) {
    return next(error);
  }
}

async function getMy(req, res, next) {
  try {
    const registrationId = registrationIdSchema.parse(req.params.registrationId);
    const registration = await registrationService.getRegistrationForUser(registrationId, req.user.id);
    return res.status(200).json({ success: true, message: 'Registration retrieved successfully.', data: { registration } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration ID.');
    return next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const registrationId = registrationIdSchema.parse(req.params.registrationId);
    const registration = await registrationService.cancelRegistration(req.user.id, registrationId);
    return res.status(200).json({ success: true, message: 'Registration cancelled successfully.', data: { registration } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration ID.');
    return next(error);
  }
}

async function listAdmin(req, res, next) {
  try {
    const payload = listRegistrationsSchema.parse(req.query);
    const result = await registrationService.listAdminRegistrations(payload);
    return res.status(200).json({ success: true, message: 'Registrations retrieved successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration filters.');
    return next(error);
  }
}

async function getAdmin(req, res, next) {
  try {
    const registrationId = registrationIdSchema.parse(req.params.registrationId);
    const registration = await registrationService.getAdminRegistration(registrationId);
    return res.status(200).json({ success: true, message: 'Registration retrieved successfully.', data: { registration } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration ID.');
    return next(error);
  }
}

async function statistics(req, res, next) {
  try {
    const statisticsValue = await registrationService.getAdminStatistics();
    return res.status(200).json({ success: true, message: 'Registration statistics retrieved successfully.', data: { statistics: statisticsValue } });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const registrationId = registrationIdSchema.parse(req.params.registrationId);
    const payload = adminStatusSchema.parse(req.body);
    const registration = await registrationService.updateAdminStatus(req.user.id, registrationId, payload.status, payload.reason);
    return res.status(200).json({ success: true, message: `Registration changed to ${payload.status}.`, data: { registration } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid registration status update.');
    return next(error);
  }
}

module.exports = { submit, listMy, getMy, cancel, listAdmin, getAdmin, statistics, updateStatus };
