import { api } from "./client.js";

export const fetchGrids = () => api("/api/grids");
export const fetchGrid = (id) => api(`/api/grids/${id}`);
export const createGrid = (payload) => api("/api/grids", { method: "POST", body: payload });
export const updateGrid = (id, payload) =>
  api(`/api/grids/${id}`, { method: "PUT", body: payload });
export const deleteGrid = (id) => api(`/api/grids/${id}`, { method: "DELETE" });
export const duplicateGrid = (id) => api(`/api/grids/${id}/duplicate`, { method: "POST" });

export const fetchGridMembers = (gridId) => api(`/api/grids/${gridId}/members`);
export const addGridMember = (gridId, payload) =>
  api(`/api/grids/${gridId}/members`, { method: "POST", body: payload });
export const updateGridMemberRole = (gridId, userId, payload) =>
  api(`/api/grids/${gridId}/members/${userId}`, { method: "PATCH", body: payload });
export const removeGridMember = (gridId, userId) =>
  api(`/api/grids/${gridId}/members/${userId}`, { method: "DELETE" });
export const leaveGrid = (gridId) => api(`/api/grids/${gridId}/leave`, { method: "POST" });
