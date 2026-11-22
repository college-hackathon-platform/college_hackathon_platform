const { analyticsDateRangeSchema } = require('./analytics.validation');
const analyticsService = require('./analytics.service');
const { successResponse } = require('./analytics.response');

function zodError(res, error) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || 'Invalid analytics filters.',
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function getMetadata(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getMetadata(payload);
    return successResponse(res, 'Analytics metadata retrieved successfully.', result.metadata, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getOverview(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getOverview(payload);
    return successResponse(res, 'Analytics overview retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getUsers(payload);
    return successResponse(res, 'User analytics retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

async function getEvents(req, res, next) {
  try {
    const payload = analyticsDateRangeSchema.parse(req.query);
    const result = await analyticsService.getEvents(payload);
    return successResponse(res, 'Event analytics retrieved successfully.', result.data, result.appliedFilters);
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error);
    return next(error);
  }
}

module.exports = { getMetadata, getOverview, getUsers, getEvents };
