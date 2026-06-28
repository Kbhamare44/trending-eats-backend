export function errorHandler(err, req, res, next) {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || "Server error",
  });
}

export function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
