const {
  createEventSchema,
  updateEventSchema,
  listEventsSchema,
  updateEventStatusSchema,
  eventIdSchema,
} = require('./adminEvent.validation');
const adminEventService = require('./adminEvent.service');

function zodError(res, error, fallback) {
  return res.status(422).json({
    success: false,
    message: error.issues[0]?.message || fallback,
  });
}

async function createEvent(req, res, next) {
  try {
    const payload = createEventSchema.parse(req.body);
    const event = await adminEventService.createEvent(payload, req.user.id);
    return res.status(201).json({ success: true, message: 'Event created successfully.', data: { event } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event data.');
    return next(error);
  }
}

async function listEvents(req, res, next) {
  try {
    const payload = listEventsSchema.parse(req.query);
    const result = await adminEventService.listEvents(payload);
    return res.status(200).json({ success: true, message: 'Events retrieved successfully.', data: result });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event filters.');
    return next(error);
  }
}

async function getEventById(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const event = await adminEventService.getEventById(eventId);
    return res.status(200).json({ success: true, message: 'Event retrieved successfully.', data: { event } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event ID.');
    return next(error);
  }
}

async function updateEvent(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const payload = updateEventSchema.parse(req.body);
    const event = await adminEventService.updateEvent(eventId, payload);
    return res.status(200).json({ success: true, message: 'Event updated successfully.', data: { event } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event update.');
    return next(error);
  }
}

async function updateEventStatus(req, res, next) {
  try {
    const eventId = eventIdSchema.parse(req.params.eventId);
    const payload = updateEventStatusSchema.parse(req.body);
    const event = await adminEventService.updateEventStatus(eventId, payload.status);
    return res.status(200).json({ success: true, message: `Event status changed to ${payload.status}.`, data: { event } });
  } catch (error) {
    if (error?.name === 'ZodError') return zodError(res, error, 'Invalid event status.');
    return next(error);
  }
}

async function getStatistics(req, res, next) {
  try {
    const statistics = await adminEventService.getEventStatistics();
    return res.status(200).json({ success: true, message: 'Event statistics retrieved successfully.', data: { statistics } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createEvent,
  listEvents,
  getEventById,
  updateEvent,
  updateEventStatus,
  getStatistics,
};
