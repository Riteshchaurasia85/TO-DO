const express = require("express");
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");
const { registerRules, loginRules } = require("../validators/authValidator");
const { validateRequest } = require("../validators/taskValidator");

const router = express.Router();

router.post("/signup", registerRules, validateRequest, authController.register);
router.post("/login", loginRules, validateRequest, authController.login);
router.get("/me", requireAuth, authController.getProfile);

module.exports = router;
