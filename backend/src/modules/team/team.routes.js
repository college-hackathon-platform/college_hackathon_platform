const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorize');
const teamController = require('./team.controller');

const router = express.Router();

router.use(authenticate, authorizeRoles('STUDENT'));
router.get('/events/available', teamController.listAvailableEvents);
router.post('/', teamController.createTeam);
router.get('/my', teamController.listMyTeams);
router.post('/join', teamController.joinTeam);
router.get('/:teamId', teamController.getTeam);
router.post('/:teamId/invitation', teamController.generateInvitation);
router.delete('/:teamId/invitation', teamController.revokeInvitation);
router.post('/:teamId/leave', teamController.leaveTeam);
router.delete('/:teamId/members/:memberId', teamController.removeMember);

module.exports = router;
