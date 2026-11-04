const { body } = require("express-validator");

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 80 }).withMessage("Name must be 80 characters or fewer"),
  body("email").trim().normalizeEmail().isEmail().withMessage("Enter a valid email address").isLength({ max: 254 }).withMessage("Email is too long"),
  body("password").isString().isLength({ min: 8, max: 128 }).withMessage("Password must be between 8 and 128 characters"),
];

const loginRules = [
  body("email").trim().normalizeEmail().isEmail().withMessage("Enter a valid email address"),
  body("password").isString().notEmpty().withMessage("Password is required"),
];

module.exports = { registerRules, loginRules };
