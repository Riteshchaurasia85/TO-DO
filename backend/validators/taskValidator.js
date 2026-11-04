const { body, param, query, validationResult } = require("express-validator");

const taskFields = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 120 }).withMessage("Title must be 120 characters or fewer"),
  body("description").optional().isString().withMessage("Description must be text").isLength({ max: 1000 }).withMessage("Description must be 1000 characters or fewer"),
  body("scheduledDate").isISO8601({ strict: true, strictSeparator: true }).withMessage("A valid scheduled date is required"),
  body("scheduledTime").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Time must use 24-hour HH:mm format"),
  body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Priority must be Low, Medium, or High"),
  body("status").optional().isIn(["In Progress", "Completed"]).withMessage("Status must be In Progress or Completed"),
];

const createTaskRules = taskFields;
const updateTaskRules = [
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isLength({ max: 120 }).withMessage("Title must be 120 characters or fewer"),
  body("description").optional().isString().withMessage("Description must be text").isLength({ max: 1000 }).withMessage("Description must be 1000 characters or fewer"),
  body("scheduledDate").optional().isISO8601({ strict: true, strictSeparator: true }).withMessage("A valid scheduled date is required"),
  body("scheduledTime").optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Time must use 24-hour HH:mm format"),
  body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Priority must be Low, Medium, or High"),
  body("status").optional().isIn(["In Progress", "Completed"]).withMessage("Status must be In Progress or Completed"),
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }
  next();
}

const taskIdRule = [param("id").isMongoId().withMessage("Task ID must be a valid MongoDB ObjectId")];
const statusRule = [body("status").isIn(["In Progress", "Completed"]).withMessage("Status must be In Progress or Completed")];
const searchRule = [query("q").optional().isString().withMessage("Search query must be text")];

module.exports = {
  createTaskRules,
  updateTaskRules,
  taskIdRule,
  statusRule,
  searchRule,
  validateRequest,
};
