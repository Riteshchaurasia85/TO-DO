import api from "./api.js";

export async function getAllTasks(params = {}) {
  const { data } = await api.get("/tasks", { params });
  return data.data;
}

export async function getTaskById(id) {
  const { data } = await api.get(`/tasks/${id}`);
  return data.data;
}

export async function createTask(task) {
  const { data } = await api.post("/tasks", task);
  return data.data;
}

export async function updateTask(id, task) {
  const { data } = await api.put(`/tasks/${id}`, task);
  return data.data;
}

export async function deleteTask(id) {
  const { data } = await api.delete(`/tasks/${id}`);
  return data;
}

export async function searchTasks(query) {
  const { data } = await api.get("/tasks/search", { params: { q: query } });
  return data.data;
}

export async function updateTaskStatus(id, status) {
  const { data } = await api.patch(`/tasks/${id}/status`, { status });
  return data.data;
}

export async function getWeeklyTasks() {
  const { data } = await api.get("/tasks/weekly");
  return data.data;
}

export async function getDashboardStats() {
  const { data } = await api.get("/tasks/stats");
  return data.data;
}
