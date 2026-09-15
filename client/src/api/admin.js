import { api } from "./client.js";

export const fetchPromosAdmin = () => api("/api/admin/promos");
export const fetchPromoAdmin = (id) => api(`/api/admin/promos/${id}`);
export const createPromoAdmin = (name) => api("/api/admin/promos", { method: "POST", body: { name } });
export const renamePromoAdmin = (id, name) => api(`/api/admin/promos/${id}`, { method: "PATCH", body: { name } });
export const deletePromoAdmin = (id) => api(`/api/admin/promos/${id}`, { method: "DELETE" });

export const addPromoStudent = (promoId, payload) =>
  api(`/api/admin/promos/${promoId}/students`, { method: "POST", body: payload });
export const importPromoStudentsCsv = (promoId, csv) =>
  api(`/api/admin/promos/${promoId}/students/import`, { method: "POST", body: { csv } });
export const updatePromoStudent = (promoId, studentId, payload) =>
  api(`/api/admin/promos/${promoId}/students/${studentId}`, { method: "PATCH", body: payload });
export const deletePromoStudent = (promoId, studentId) =>
  api(`/api/admin/promos/${promoId}/students/${studentId}`, { method: "DELETE" });

export const fetchUsersAdmin = () => api("/api/admin/users");
export const updateUserRoleAdmin = (id, role) => api(`/api/admin/users/${id}`, { method: "PATCH", body: { role } });
