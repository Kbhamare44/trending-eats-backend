// This runs when any route calls next(error)
// It catches all unhandled errors and sends a consistent JSON response
// instead of crashing the server or leaking internal details

export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : "Something went wrong";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

// A helper to create errors with a status code attached
// Usage: throw createError(404, "Spot not found")
export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
