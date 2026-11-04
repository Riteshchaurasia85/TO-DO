const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

function createToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, { subject: userId, expiresIn: "7d" });
}

function accountResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

exports.register = asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    passwordHash,
  });
  res.status(201).json({
    success: true,
    message: "Your account is ready",
    data: { user: accountResponse(user), token: createToken(user.id) },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  const validPassword = user && await bcrypt.compare(req.body.password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ success: false, message: "Email or password is incorrect" });
  }
  res.json({
    success: true,
    message: "Signed in successfully",
    data: { user: accountResponse(user), token: createToken(user.id) },
  });
});

exports.getProfile = (req, res) => {
  res.json({
    success: true,
    message: "Profile retrieved successfully",
    data: { user: req.user },
  });
};
