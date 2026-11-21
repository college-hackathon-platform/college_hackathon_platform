const nodemailer = require('nodemailer');
const { getMailConfig } = require('./env');

function createTransporter() {
  const config = getMailConfig();
  if (!config.configured) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

module.exports = { createTransporter, getMailConfig };
