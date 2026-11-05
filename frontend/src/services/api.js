import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://to-do-ugqw.onrender.com",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taskflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
