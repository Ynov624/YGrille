import * as groups from "../services/groups.service.js";
import { badRequest } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await groups.listGroups(req.params.gridId, req.user.id));
});

export const create = asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) throw badRequest("Groupe invalide.", ["Le nom du groupe est obligatoire."]);
  res.status(201).json(await groups.createGroup(req.params.gridId, req.user.id, name));
});

export const remove = asyncHandler(async (req, res) => {
  await groups.deleteGroup(req.params.gridId, req.user.id, req.params.id);
  res.status(204).end();
});
