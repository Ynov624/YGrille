import { randomUUID } from "node:crypto";
import { all, get, run, batch } from "../db/connection.js";
import { notFound } from "../utils/errors.js";
import { assertGridAccess } from "./grids.service.js";
import { assertLockPermitted } from "./locks.service.js";
import { listPromoStudentsForImport } from "./promos.service.js";

const STUDENT_FIELDS = "id, last_name, first_name, comment, group_id";

export async function listStudents(gridId, userId) {
  await assertGridAccess(gridId, userId);
  return all(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE grid_id = ? ORDER BY last_name, first_name`,
    [gridId]
  );
}

export async function createStudent(gridId, userId, payload) {
  await assertGridAccess(gridId, userId);
  const id = randomUUID();
  await run("INSERT INTO students (id, grid_id, last_name, first_name) VALUES (?, ?, ?, ?)", [
    id,
    gridId,
    payload.lastName,
    payload.firstName,
  ]);
  return get(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
}

/** Import en masse (ex. CSV) : ajoute les élèves à la liste existante de la grille, en un seul lot. */
export async function importStudents(gridId, userId, entries) {
  await assertGridAccess(gridId, userId);
  await batch(
    entries.map((s) => ({
      sql: "INSERT INTO students (id, grid_id, last_name, first_name) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), gridId, s.lastName, s.firstName],
    }))
  );
  return listStudents(gridId, userId);
}

/** Importe les élèves d'une promo (gérée dans le panneau admin) dans la grille. */
export async function importStudentsFromPromo(gridId, userId, promoId) {
  const entries = await listPromoStudentsForImport(promoId);
  return importStudents(gridId, userId, entries);
}

export async function updateStudent(gridId, userId, id, payload) {
  await assertGridAccess(gridId, userId);
  if (payload.comment !== undefined) {
    await assertLockPermitted(gridId, ["eval:student:" + id + ":general"], userId);
  }

  const current = await get(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ? AND grid_id = ?`, [
    id,
    gridId,
  ]);
  if (!current) throw notFound("Élève introuvable.");
  const comment = payload.comment !== undefined ? payload.comment : current.comment;
  await run(
    "UPDATE students SET last_name = ?, first_name = ?, comment = ? WHERE id = ? AND grid_id = ?",
    [payload.lastName, payload.firstName, comment, id, gridId]
  );
  return get(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
}

/** Applique la même appréciation générale à tous les membres d'un groupe. */
export async function updateGroupComment(gridId, userId, groupId, comment) {
  await assertGridAccess(gridId, userId);
  const group = await get("SELECT id FROM `groups` WHERE id = ? AND grid_id = ?", [
    groupId,
    gridId,
  ]);
  if (!group) throw notFound("Groupe introuvable dans cette grille.");

  const members = await all(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE group_id = ? AND grid_id = ?`,
    [groupId, gridId]
  );
  if (members.length === 0) return [];

  const keys = members.map((m) => "eval:student:" + m.id + ":general");
  await assertLockPermitted(gridId, keys, userId);

  await batch(
    members.map((m) => ({
      sql: "UPDATE students SET comment = ? WHERE id = ? AND grid_id = ?",
      args: [comment, m.id, gridId],
    }))
  );

  return all(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE group_id = ? AND grid_id = ? ORDER BY last_name, first_name`,
    [groupId, gridId]
  );
}

export async function deleteStudent(gridId, userId, id) {
  await assertGridAccess(gridId, userId);
  const affectedRows = await run("DELETE FROM students WHERE id = ? AND grid_id = ?", [id, gridId]);
  if (affectedRows === 0) throw notFound("Élève introuvable.");
}

export async function setStudentGroup(gridId, userId, id, groupId) {
  await assertGridAccess(gridId, userId);
  if (groupId) {
    const group = await get("SELECT id FROM `groups` WHERE id = ? AND grid_id = ?", [
      groupId,
      gridId,
    ]);
    if (!group) throw notFound("Groupe introuvable dans cette grille.");
  }
  const affectedRows = await run("UPDATE students SET group_id = ? WHERE id = ? AND grid_id = ?", [
    groupId,
    id,
    gridId,
  ]);
  if (affectedRows === 0) throw notFound("Élève introuvable.");
  return get(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
}
