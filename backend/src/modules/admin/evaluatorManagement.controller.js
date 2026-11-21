const {
  eventIdSchema,
  invitationIdSchema,
  inviteEvaluatorSchema,
  listEvaluatorSchema,
} = require('./evaluatorManagement.validation');
const evaluatorService = require('./evaluatorManagement.service');
const { verifyMailConfiguration } = require('../../services/mailService');

function zodError(res, error, fallback) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallback,
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function list(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const payload = listEvaluatorSchema.parse(req.query);
    const result = await evaluatorService.listEvaluators(eventId, payload);
    return res.status(200).json({ success: true, message: 'Evaluator invitations retrieved successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid evaluator invitation filters.');
    return next(error);
  }
}

async function invite(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const payload = inviteEvaluatorSchema.parse(req.body);
    const result = await evaluatorService.inviteEvaluator(eventId, payload, req.user.id);
    return res.status(201).json({ success: true, message: 'Evaluator invitation created successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid evaluator invitation.');
    return next(error);
  }
}

async function revoke(req, res, next) {
  try {
    const invitationId = invitationIdSchema.parse(req.params.invitationId);
    const invitation = await evaluatorService.revokeInvitation(invitationId);
    return res.status(200).json({ success: true, message: 'Evaluator invitation revoked successfully.', data: { invitation } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid invitation ID.');
    return next(error);
  }
}

async function regenerate(req, res, next) {
  try {
    const invitationId = invitationIdSchema.parse(req.params.invitationId);
    const result = await evaluatorService.regenerateInvitation(invitationId, req.user.id);
    return res.status(201).json({ success: true, message: 'Evaluator invitation regenerated successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid invitation ID.');
    return next(error);
  }
}

async function resend(req, res, next) {
  try {
    const invitationId = invitationIdSchema.parse(req.params.invitationId);
    const result = await evaluatorService.resendInvitation(invitationId);
    return res.status(200).json({ success: true, message: result.emailDelivered ? 'Evaluator invitation email sent successfully.' : 'Invitation exists, but email delivery failed.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid invitation ID.');
    return next(error);
  }
}

async function verifyMail(req, res, next) {
  try {
    const result = await verifyMailConfiguration();
    return res.status(result.configured ? 200 : 503).json({
      success: result.verified,
      message: result.message,
      data: { configured: result.configured, verified: result.verified },
    });
  } catch {
    return res.status(502).json({
      success: false,
      message: 'SMTP verification failed.',
      data: { configured: true, verified: false },
    });
  }
}

module.exports = { list, invite, revoke, regenerate, resend, verifyMail };
