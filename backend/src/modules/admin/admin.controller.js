const {
  listUsersSchema,
  userIdSchema,
  updateUserSchema,
  updateStatusSchema,
  createFacultySchema,
} = require('./admin.validation');
const adminService = require('./admin.service');

function zodErrorResponse(res, error, fallbackMessage) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallbackMessage,
  });
}

async function listUsers(req, res, next) {
  try {
    const parsed = listUsersSchema.parse(req.query);
    const result = await adminService.listUsers(parsed);
    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully.',
      data: result,
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return zodErrorResponse(res, error, 'Invalid user filters.');
    }
    return next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const user = await adminService.getUserById(userId);
    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully.',
      data: { user },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return zodErrorResponse(res, error, 'Invalid user ID.');
    }
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const payload = updateUserSchema.parse(req.body);
    const user = await adminService.updateUser(userId, payload);
    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully.',
      data: { user },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return zodErrorResponse(res, error, 'Invalid profile data.');
    }
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const userId = userIdSchema.parse(req.params.userId);
    const payload = updateStatusSchema.parse(req.body);
    const result = await adminService.updateUserStatus(userId, payload.status, req.user.id);

    return res.status(200).json({
      success: true,
      message: result.changed
        ? `User account status changed to ${payload.status}.`
        : `User account is already ${payload.status}.`,
      data: result,
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return zodErrorResponse(res, error, 'Invalid account status data.');
    }
    return next(error);
  }
}

async function createFaculty(req, res, next) {
  try {
    const payload = createFacultySchema.parse(req.body);
    const user = await adminService.createFaculty(payload);
    return res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      data: { user },
    });
  } catch (error) {
    if (error && error.name === 'ZodError') {
      return zodErrorResponse(res, error, 'Invalid faculty account data.');
    }
    return next(error);
  }
}

async function getStatistics(req, res, next) {
  try {
    const statistics = await adminService.getUserStatistics();
    return res.status(200).json({
      success: true,
      message: 'User statistics retrieved successfully.',
      data: { statistics },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  createFaculty,
  getStatistics,
};
