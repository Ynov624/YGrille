import * as grids from "../services/grids.service.js";
import { validateGridPayload } from "../utils/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await grids.listGrids(req.user.id));
});

export const detail = asyncHandler(async (req, res) => {
  res.json(await grids.getGrid(req.params.id, req.user.id));
});

export const create = asyncHandler(async (req, res) => {
  const payload = validateGridPayload(req.body);
  res.status(201).json(await grids.createGrid(req.user.id, payload));
});

export const update = asyncHandler(async (req, res) => {
  const payload = validateGridPayload(req.body);
  res.json(await grids.updateGrid(req.params.id, req.user.id, payload));
});

export const remove = asyncHandler(async (req, res) => {
  await grids.deleteGrid(req.params.id, req.user.id);
  res.status(204).end();
});

export const duplicate = asyncHandler(async (req, res) => {
  res.status(201).json(await grids.duplicateGrid(req.params.id, req.user.id));
});
