const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");

const requireAuth = asyncHandler(async (req, res, next) => {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Please sign in to continue" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Your session has expired. Please sign in again." });
    }
    throw error;
  }

  const user = await User.findById(payload.sub).select("_id name email");
  if (!user) {
    return res.status(401).json({ success: false, message: "Your account is no longer available. Please sign in again." });
  }
  req.user = { id: user.id, name: user.name, email: user.email };
  next();
});

module.exports = requireAuth;
