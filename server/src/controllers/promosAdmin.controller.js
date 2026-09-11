import * as promos from "../services/promos.service.js";
import { validatePromoPayload, validatePromoStudentPayload } from "../utils/validate.js";
import { parseStudentsCsv } from "../utils/csv.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await promos.listPromos());
});

export const detail = asyncHandler(async (req, res) => {
  res.json(await promos.getPromo(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  const payload = validatePromoPayload(req.body);
  res.status(201).json(await promos.createPromo(payload.name));
});

export const rename = asyncHandler(async (req, res) => {
  const payload = validatePromoPayload(req.body);
  res.json(await promos.renamePromo(req.params.id, payload.name));
});

export const remove = asyncHandler(async (req, res) => {
  await promos.deletePromo(req.params.id);
  res.status(204).end();
});

export const addStudent = asyncHandler(async (req, res) => {
  const payload = validatePromoStudentPayload(req.body);
  res.status(201).json(await promos.addPromoStudent(req.params.id, payload));
});

export const importCsv = asyncHandler(async (req, res) => {
  const entries = parseStudentsCsv(req.body?.csv);
  res.status(201).json(await promos.importPromoStudents(req.params.id, entries));
});

export const updateStudent = asyncHandler(async (req, res) => {
  const payload = validatePromoStudentPayload(req.body);
  res.json(await promos.updatePromoStudent(req.params.id, req.params.studentId, payload));
});

export const removeStudent = asyncHandler(async (req, res) => {
  await promos.deletePromoStudent(req.params.id, req.params.studentId);
  res.status(204).end();
});
