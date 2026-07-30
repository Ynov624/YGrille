import * as students from "../services/students.service.js";
import { validateStudentPayload } from "../utils/validate.js";
import { parseStudentsCsv } from "../utils/csv.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await students.listStudents(req.params.gridId, req.user.id));
});

export const create = asyncHandler(async (req, res) => {
  const payload = validateStudentPayload(req.body);
  res.status(201).json(await students.createStudent(req.params.gridId, req.user.id, payload));
});

export const importCsv = asyncHandler(async (req, res) => {
  const entries = parseStudentsCsv(req.body?.csv);
  res.status(201).json(await students.importStudents(req.params.gridId, req.user.id, entries));
});

export const update = asyncHandler(async (req, res) => {
  const payload = validateStudentPayload(req.body);
  res.json(await students.updateStudent(req.params.gridId, req.user.id, req.params.id, payload));
});

export const remove = asyncHandler(async (req, res) => {
  await students.deleteStudent(req.params.gridId, req.user.id, req.params.id);
  res.status(204).end();
});

export const setGroup = asyncHandler(async (req, res) => {
  const groupId = typeof req.body?.groupId === "string" && req.body.groupId ? req.body.groupId : null;
  res.json(await students.setStudentGroup(req.params.gridId, req.user.id, req.params.id, groupId));
});
