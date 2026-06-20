// 404 for unmatched routes
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Central error handler — keeps responses shaped consistently.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Mongoose CastError (e.g. invalid ObjectId in a URL param) → 400
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }
  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ message });
  }
  const code = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(code).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
