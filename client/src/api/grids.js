import { api } from "./client.js";

export const fetchGrids = () => api("/api/grids");
export const fetchGrid = (id) => api(`/api/grids/${id}`);
export const createGrid = (payload) => api("/api/grids", { method: "POST", body: payload });
export const updateGrid = (id, payload) => api(`/api/grids/${id}`, { method: "PUT", body: payload });
export const deleteGrid = (id) => api(`/api/grids/${id}`, { method: "DELETE" });
export const duplicateGrid = (id) => api(`/api/grids/${id}/duplicate`, { method: "POST" });
