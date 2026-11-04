const express = require("express");
const controller = require("../controllers/taskController");
const requireAuth = require("../middleware/authMiddleware");
const {
  createTaskRules, updateTaskRules, taskIdRule, statusRule, searchRule, validateRequest,
} = require("../validators/taskValidator");

const router = express.Router();

router.use(requireAuth);
router.post("/", createTaskRules, validateRequest, controller.createTask);
router.get("/", controller.getAllTasks);
router.get("/search", searchRule, validateRequest, controller.searchTasks);
router.get("/weekly", controller.getWeeklyTasks);
router.get("/stats", controller.getDashboardStats);
router.get("/:id", taskIdRule, validateRequest, controller.getTask);
router.put("/:id", taskIdRule, updateTaskRules, validateRequest, controller.updateTask);
router.delete("/:id", taskIdRule, validateRequest, controller.deleteTask);
router.patch("/:id/status", taskIdRule, statusRule, validateRequest, controller.updateTaskStatus);

module.exports = router;
