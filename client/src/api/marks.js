import { api } from "./client.js";

export const fetchMarks = (gridId) => api(`/api/grids/${gridId}/marks`);
/** `payload` est partiel : { levelPosition?, points?, comment? } - cf. marks.service.js côté serveur. */
export const setMark = (gridId, studentId, criterionId, payload) =>
  api(`/api/grids/${gridId}/marks/${studentId}/${criterionId}`, {
    method: "PUT",
    body: payload,
  });
export const setGroupMark = (gridId, groupId, criterionId, levelPosition) =>
  api(`/api/grids/${gridId}/marks/group/${groupId}/${criterionId}`, {
    method: "PUT",
    body: { levelPosition },
  });
