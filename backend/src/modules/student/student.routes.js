const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const authorizeRoles = require('../../middleware/authorize');

const router = express.Router();

router.get('/access-check', authenticate, authorizeRoles('STUDENT'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student access authorized.',
  });
});

module.exports = router;
