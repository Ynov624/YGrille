import { randomUUID } from "node:crypto";
import { all, get, run } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

async function assertGridExists(gridId, userId) {
  const grid = await get("SELECT id FROM grids WHERE id = ? AND user_id = ?", [gridId, userId]);
  if (!grid) throw notFound("Grille introuvable.");
}

export async function listGroups(gridId, userId) {
  await assertGridExists(gridId, userId);
  return all("SELECT id, name FROM `groups` WHERE grid_id = ? ORDER BY name", [gridId]);
}

export async function createGroup(gridId, userId, name) {
  await assertGridExists(gridId, userId);
  const id = randomUUID();
  await run("INSERT INTO `groups` (id, grid_id, name) VALUES (?, ?, ?)", [id, gridId, name]);
  return { id, name };
}

export async function deleteGroup(gridId, userId, id) {
  await assertGridExists(gridId, userId);
  const affectedRows = await run("DELETE FROM `groups` WHERE id = ? AND grid_id = ?", [id, gridId]);
  if (affectedRows === 0) throw notFound("Groupe introuvable.");
}
