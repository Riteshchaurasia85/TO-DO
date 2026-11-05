const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");
const notFoundMiddleware = require("./middleware/notFoundMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "TaskFlow Backend is running successfully!"
    });
});
app.get("/api/health", (req, res) => res.status(200).json({ success: true, message: "TaskFlow API is healthy" }));
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
