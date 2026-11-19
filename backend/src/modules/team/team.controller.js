const {
  teamIdSchema,
  memberIdSchema,
  createTeamSchema,
  joinTeamSchema,
  listMyTeamsSchema,
  listAvailableEventsSchema,
} = require('./team.validation');
const teamService = require('./team.service');

function zodError(res, error, fallback) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallback,
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function createTeam(req, res, next) {
  try {
    const payload = createTeamSchema.parse(req.body);
    const team = await teamService.createTeam(req.user.id, payload);
    return res.status(201).json({ success: true, message: 'Team created successfully.', data: { team } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team data.');
    return next(error);
  }
}

async function listAvailableEvents(req, res, next) {
  try {
    const payload = listAvailableEventsSchema.parse(req.query);
    const result = await teamService.listAvailableEvents(req.user.id, payload);
    return res.status(200).json({
      success: true,
      message: 'Available events retrieved successfully.',
      data: result,
    });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event pagination.');
    return next(error);
  }
}

async function listMyTeams(req, res, next) {
  try {
    const payload = listMyTeamsSchema.parse(req.query);
    const result = await teamService.listMyTeams(req.user.id, payload);
    return res.status(200).json({ success: true, message: 'Teams retrieved successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid pagination.');
    return next(error);
  }
}

async function getTeam(req, res, next) {
  try {
    const teamId = teamIdSchema.parse(req.params.teamId);
    const team = await teamService.getTeamForUser(teamId, req.user.id);
    return res.status(200).json({ success: true, message: 'Team retrieved successfully.', data: { team } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team ID.');
    return next(error);
  }
}

async function generateInvitation(req, res, next) {
  try {
    const teamId = teamIdSchema.parse(req.params.teamId);
    const result = await teamService.manageInvitation(teamId, req.user.id, true);
    return res.status(201).json({ success: true, message: 'Invitation generated successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team ID.');
    return next(error);
  }
}

async function revokeInvitation(req, res, next) {
  try {
    const teamId = teamIdSchema.parse(req.params.teamId);
    const result = await teamService.manageInvitation(teamId, req.user.id, false);
    return res.status(200).json({ success: true, message: 'Invitation revoked successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team ID.');
    return next(error);
  }
}

async function joinTeam(req, res, next) {
  try {
    const payload = joinTeamSchema.parse(req.body);
    const team = await teamService.joinTeam(req.user.id, payload.invitationCode);
    return res.status(200).json({ success: true, message: 'You joined the team successfully.', data: { team } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid invitation.');
    return next(error);
  }
}

async function leaveTeam(req, res, next) {
  try {
    const teamId = teamIdSchema.parse(req.params.teamId);
    const result = await teamService.leaveTeam(teamId, req.user.id);
    return res.status(200).json({ success: true, message: 'You left the team successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team ID.');
    return next(error);
  }
}

async function removeMember(req, res, next) {
  try {
    const teamId = teamIdSchema.parse(req.params.teamId);
    const memberId = memberIdSchema.parse(req.params.memberId);
    const result = await teamService.removeMember(teamId, memberId, req.user.id);
    return res.status(200).json({ success: true, message: 'Team member removed successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid team or member ID.');
    return next(error);
  }
}

module.exports = { createTeam, listMyTeams, getTeam, generateInvitation, revokeInvitation, joinTeam, leaveTeam, removeMember, listAvailableEvents };
