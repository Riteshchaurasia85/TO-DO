import api from "./api.js";

export async function registerAccount(profile) {
  const { data } = await api.post("/auth/signup", profile);
  return data.data;
}

export async function loginAccount(credentials) {
  const { data } = await api.post("/auth/login", credentials);
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data.data.user;
}
