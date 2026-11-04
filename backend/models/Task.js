const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["In Progress", "Completed"], default: "In Progress" },
  },
  { timestamps: true },
);

taskSchema.index({ scheduledDate: 1 });
taskSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Task", taskSchema);
