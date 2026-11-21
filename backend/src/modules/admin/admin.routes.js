const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorize');
const adminController = require('./admin.controller');
const adminEventController = require('./adminEvent.controller');
const adminTeamRegistrationService = require('./adminTeamRegistration.service');
const registrationController = require('../registration/registration.controller');
const facultyController = require('./facultyManagement.controller');
const evaluatorController = require('./evaluatorManagement.controller');
const platformSettingsController = require('./platformSettings.controller');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const evaluatorEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many evaluator email actions. Please try again later.' },
});

router.get('/access-check', authenticate, authorizeRoles('ADMIN'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin access authorized.',
  });
});

router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/users/statistics', adminController.getStatistics);
router.get('/users', adminController.listUsers);
router.post('/users/faculty', adminController.createFaculty);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId', adminController.updateUser);
router.get('/settings', platformSettingsController.getSettings);
router.patch('/settings', platformSettingsController.updateSettings);
router.get('/events/statistics', adminEventController.getStatistics);
router.get('/events', adminEventController.listEvents);
router.post('/events', adminEventController.createEvent);
router.get('/events/:eventId', adminEventController.getEventById);
router.patch('/events/:eventId/status', adminEventController.updateEventStatus);
router.patch('/events/:eventId', adminEventController.updateEvent);
router.get('/faculty', facultyController.list);
router.get('/faculty/:facultyId/assignments', facultyController.get);
router.get('/faculty/:facultyId', facultyController.get);
router.post('/events/:eventId/faculty', facultyController.assign);
router.delete('/events/:eventId/faculty/:facultyId', facultyController.remove);
router.get('/events/:eventId/evaluators', evaluatorController.list);
router.post('/events/:eventId/evaluators', evaluatorEmailLimiter, evaluatorController.invite);
router.patch('/evaluators/:invitationId/revoke', evaluatorController.revoke);
router.post('/evaluators/:invitationId/regenerate', evaluatorEmailLimiter, evaluatorController.regenerate);
router.post('/evaluators/:invitationId/resend', evaluatorEmailLimiter, evaluatorController.resend);
router.post('/mail/verify', evaluatorEmailLimiter, evaluatorController.verifyMail);
router.get('/teams/statistics', async (req, res, next) => {
  try {
    const statistics = await adminTeamRegistrationService.teamStatistics();
    return res.status(200).json({ success: true, message: 'Team statistics retrieved successfully.', data: { statistics } });
  } catch (error) {
    return next(error);
  }
});
router.get('/teams', async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const sortBy = ['name', 'createdAt', 'status'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
    const result = await adminTeamRegistrationService.listTeams({
      page,
      limit,
      search: String(req.query.search || '').trim().slice(0, 100),
      eventId: req.query.eventId || undefined,
      status: req.query.status || undefined,
      sortBy,
      sortOrder,
    });
    return res.status(200).json({ success: true, message: 'Teams retrieved successfully.', data: result });
  } catch (error) {
    return next(error);
  }
});
router.get('/teams/:teamId', async (req, res, next) => {
  try {
    const team = await adminTeamRegistrationService.getTeam(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found.' });
    return res.status(200).json({ success: true, message: 'Team retrieved successfully.', data: { team } });
  } catch (error) {
    return next(error);
  }
});
router.get('/registrations/statistics', registrationController.statistics);
router.get('/registrations', registrationController.listAdmin);
router.get('/registrations/:registrationId', registrationController.getAdmin);
router.patch('/registrations/:registrationId/status', registrationController.updateStatus);

module.exports = router;
