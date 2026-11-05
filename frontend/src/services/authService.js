import api from "./api.js";

export async function registerAccount(profile) {
  const { data } = await api.post("/api/auth/signup", profile);
  return data.data;
}

export async function loginAccount(credentials) {
  const { data } = await api.post("/api/auth/login", credentials);
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/api/auth/me");
  return data.data.user;
}
