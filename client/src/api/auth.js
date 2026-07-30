import { api } from "./client.js";

export const fetchMe = () => api("/api/auth/me");
export const login = (email, password) => api("/api/auth/login", { method: "POST", body: { email, password } });
export const register = (email, password, name) =>
  api("/api/auth/register", { method: "POST", body: { email, password, name } });
export const verifyEmail = (email, code) =>
  api("/api/auth/verify-email", { method: "POST", body: { email, code } });
export const resendCode = (email) => api("/api/auth/resend-code", { method: "POST", body: { email } });
export const logout = () => api("/api/auth/logout", { method: "POST" });
