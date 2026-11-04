const Task = require("../models/Task");
const asyncHandler = require("../utils/asyncHandler");
const { getTaskWeekBounds, sortWeeksCurrentFirst } = require("../utils/weekUtils");

const success = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

function taskDateValue(date) {
  return new Date(`${new Date(date).toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isOverdue(task, now) {
  const scheduled = new Date(`${new Date(task.scheduledDate).toISOString().slice(0, 10)}T${task.scheduledTime}:00.000Z`);
  return task.status !== "Completed" && scheduled < now;
}

exports.createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({
    ...req.body,
    scheduledDate: taskDateValue(req.body.scheduledDate),
    owner: req.user.id,
  });
  success(res, "Task created successfully", task, 201);
});

exports.getAllTasks = asyncHandler(async (req, res) => {
  const { page, limit, status, priority, date } = req.query;
  const filter = { owner: req.user.id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (date) {
    const start = taskDateValue(date);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.scheduledDate = { $gte: start, $lt: end };
  }
  const sort = { scheduledDate: 1, scheduledTime: 1, createdAt: -1 };
  if (page !== undefined || limit !== undefined) {
    const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip((parsedPage - 1) * parsedLimit).limit(parsedLimit).lean(),
      Task.countDocuments(filter),
    ]);
    return success(res, "Tasks retrieved successfully", { tasks, page: parsedPage, limit: parsedLimit, total });
  }
  const tasks = await Task.find(filter).sort(sort).lean();
  success(res, "Tasks retrieved successfully", { tasks, total: tasks.length });
});

exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  success(res, "Task retrieved successfully", task);
});

exports.updateTask = asyncHandler(async (req, res) => {
  const allowedFields = ["title", "description", "scheduledDate", "scheduledTime", "priority", "status"];
  const updates = Object.fromEntries(
    allowedFields
      .filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
      .map((field) => [field, req.body[field]]),
  );
  if (updates.scheduledDate) updates.scheduledDate = taskDateValue(updates.scheduledDate);
  const task = await Task.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, updates, {
    new: true,
    runValidators: true,
  });
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  success(res, "Task updated successfully", task);
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  success(res, "Task deleted successfully", { id: task.id });
});

exports.searchTasks = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return success(res, "Search completed", { tasks: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tasks = await Task.find({
    owner: req.user.id,
    $or: [
      { title: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ],
  }).sort({ scheduledDate: 1, scheduledTime: 1 }).lean();
  success(res, "Search completed", { tasks, total: tasks.length });
});

exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { status: req.body.status },
    { new: true, runValidators: true },
  );
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });
  success(res, "Task status updated successfully", task);
});

exports.getWeeklyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ owner: req.user.id }).sort({ scheduledDate: 1, scheduledTime: 1 }).lean();
  const groups = new Map();
  for (const task of tasks) {
    const { weekStart, weekEnd } = getTaskWeekBounds(task.scheduledDate);
    const key = weekStart.toISOString();
    if (!groups.has(key)) {
      groups.set(key, { weekStart, weekEnd, totalTasks: 0, openTasks: 0, completedTasks: 0, progressPercentage: 0, tasks: [] });
    }
    const group = groups.get(key);
    group.totalTasks += 1;
    if (task.status === "Completed") group.completedTasks += 1;
    else group.openTasks += 1;
    group.tasks.push(task);
  }
  const result = sortWeeksCurrentFirst(Array.from(groups.values())).map((group) => ({
    ...group,
    progressPercentage: group.totalTasks ? Math.round((group.completedTasks / group.totalTasks) * 100) : 0,
  }));
  success(res, "Weekly tasks retrieved successfully", result);
});

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const [totalTasks, openTasks, completedTasks, openTaskRecords] = await Promise.all([
    Task.countDocuments({ owner: req.user.id }),
    Task.countDocuments({ owner: req.user.id, status: "In Progress" }),
    Task.countDocuments({ owner: req.user.id, status: "Completed" }),
    Task.find({ owner: req.user.id, status: "In Progress" }).select("scheduledDate scheduledTime").lean(),
  ]);
  const now = new Date();
  const overdueTasks = openTaskRecords.filter((task) => isOverdue(task, now)).length;
  success(res, "Dashboard statistics retrieved successfully", { totalTasks, openTasks, completedTasks, overdueTasks });
});
