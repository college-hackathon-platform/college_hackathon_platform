const { facultyIdSchema, eventIdSchema, listFacultySchema, assignFacultySchema } = require('./facultyManagement.validation');
const facultyService = require('./facultyManagement.service');

function zodError(res, error, fallback) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallback,
    errors: Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'request', issue.message])),
  });
}

async function list(req, res, next) {
  try {
    const payload = listFacultySchema.parse(req.query);
    const result = await facultyService.listFaculty(payload);
    return res.status(200).json({ success: true, message: 'Faculty retrieved successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid Faculty filters.');
    return next(error);
  }
}

async function get(req, res, next) {
  try {
    const facultyId = facultyIdSchema.parse(req.params.facultyId);
    const faculty = await facultyService.getFaculty(facultyId);
    return res.status(200).json({ success: true, message: 'Faculty retrieved successfully.', data: { faculty } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid Faculty ID.');
    return next(error);
  }
}

async function assign(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const payload = assignFacultySchema.parse(req.body);
    const facultyId = facultyIdSchema.parse(payload.facultyId);
    const assignment = await facultyService.assignFaculty(eventId, facultyId, req.user.id);
    return res.status(201).json({ success: true, message: 'Faculty assigned successfully.', data: { assignment } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid Faculty assignment.');
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const facultyId = facultyIdSchema.parse(req.params.facultyId);
    const result = await facultyService.removeAssignment(eventId, facultyId);
    return res.status(200).json({ success: true, message: 'Faculty assignment removed successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid assignment ID.');
    return next(error);
  }
}

module.exports = { list, get, assign, remove };
