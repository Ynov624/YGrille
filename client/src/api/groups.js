import { api } from "./client.js";

export const fetchGroups = (gridId) => api(`/api/grids/${gridId}/groups`);
export const createGroup = (gridId, name) =>
  api(`/api/grids/${gridId}/groups`, { method: "POST", body: { name } });
export const deleteGroup = (gridId, id) =>
  api(`/api/grids/${gridId}/groups/${id}`, { method: "DELETE" });
export const setStudentGroup = (gridId, studentId, groupId) =>
  api(`/api/grids/${gridId}/students/${studentId}/group`, { method: "PUT", body: { groupId } });
