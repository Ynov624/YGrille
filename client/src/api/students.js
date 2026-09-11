import { api } from "./client.js";

export const fetchStudents = (gridId) => api(`/api/grids/${gridId}/students`);
export const createStudent = (gridId, payload) =>
  api(`/api/grids/${gridId}/students`, { method: "POST", body: payload });
export const updateStudent = (gridId, id, payload) =>
  api(`/api/grids/${gridId}/students/${id}`, { method: "PATCH", body: payload });
export const deleteStudent = (gridId, id) =>
  api(`/api/grids/${gridId}/students/${id}`, { method: "DELETE" });
export const importStudentsCsv = (gridId, csv) =>
  api(`/api/grids/${gridId}/students/import`, { method: "POST", body: { csv } });
export const importStudentsFromPromo = (gridId, promoId) =>
  api(`/api/grids/${gridId}/students/import-promo`, { method: "POST", body: { promoId } });
