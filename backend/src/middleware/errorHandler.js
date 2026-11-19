function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error && Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = error && error.message ? error.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error('Unhandled server error:', message);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(error.errors ? { errors: error.errors } : {}),
  });
}

module.exports = errorHandler;
