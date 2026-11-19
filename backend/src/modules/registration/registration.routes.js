const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorize');
const registrationController = require('./registration.controller');

const router = express.Router();

router.use(authenticate);
router.post('/', authorizeRoles('STUDENT'), registrationController.submit);
router.get('/my', authorizeRoles('STUDENT'), registrationController.listMy);
router.get('/:registrationId', authorizeRoles('STUDENT'), registrationController.getMy);
router.post('/:registrationId/cancel', authorizeRoles('STUDENT'), registrationController.cancel);

module.exports = router;
