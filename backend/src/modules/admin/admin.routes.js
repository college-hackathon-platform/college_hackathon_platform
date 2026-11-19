const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorize');
const adminController = require('./admin.controller');
const adminEventController = require('./adminEvent.controller');

const router = express.Router();

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
router.get('/events/statistics', adminEventController.getStatistics);
router.get('/events', adminEventController.listEvents);
router.post('/events', adminEventController.createEvent);
router.get('/events/:eventId', adminEventController.getEventById);
router.patch('/events/:eventId/status', adminEventController.updateEventStatus);
router.patch('/events/:eventId', adminEventController.updateEvent);

module.exports = router;
