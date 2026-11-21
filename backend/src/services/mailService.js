const { createTransporter, getMailConfig } = require('../config/mail');
const { evaluatorInvitationEmail } = require('../templates/evaluatorInvitationEmail');

async function sendEvaluatorInvitation({ evaluatorName, evaluatorEmail, event, designation, organization, invitationMessage, expiresAt, invitationToken }) {
  const config = getMailConfig();
  if (!config.configured) {
    throw new Error('SMTP is not configured');
  }

  const transporter = createTransporter();
  if (!transporter) throw new Error('SMTP transporter could not be initialized');

  const invitationUrl = `${config.frontendUrl}/evaluator/invitations/${encodeURIComponent(invitationToken)}`;
  const template = evaluatorInvitationEmail({
    evaluatorName,
    event,
    designation,
    organization,
    invitationMessage,
    expiresAt,
    invitationUrl,
    platformName: config.fromName,
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: evaluatorEmail,
    subject: template.subject,
    html: template.html,
  });

  return invitationUrl;
}

async function verifyMailConfiguration() {
  const config = getMailConfig();
  if (!config.configured) return { configured: false, verified: false, message: 'SMTP configuration is incomplete.' };
  const transporter = createTransporter();
  await transporter.verify();
  return { configured: true, verified: true, message: 'SMTP configuration verified.' };
}

module.exports = { sendEvaluatorInvitation, verifyMailConfiguration };
