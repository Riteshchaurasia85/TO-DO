function errorMiddleware(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Validation failed", errors: Object.values(error.errors).map((item) => ({ field: item.path, message: item.message })) });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid identifier" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: "An account with that email address already exists" });
  }
  console.error(error);
  res.status(500).json({ success: false, message: "Internal server error" });
}

module.exports = errorMiddleware;
