import { all, get, run, batch } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

async function assertGridExists(gridId, userId) {
  const grid = await get("SELECT id FROM grids WHERE id = ? AND user_id = ?", [gridId, userId]);
  if (!grid) throw notFound("Grille introuvable.");
}

export async function listMarks(gridId, userId) {
  await assertGridExists(gridId, userId);
  return all(
    `SELECT m.student_id, m.criterion_id, m.level_position, m.comment
     FROM marks m
     JOIN students s ON s.id = m.student_id
     WHERE s.grid_id = ?`,
    [gridId]
  );
}

/**
 * Met à jour (partiellement) la note d'un élève sur un critère : niveau et/ou
 * appréciation. Les champs absents du payload conservent leur valeur actuelle
 * (ou leur valeur par défaut si la note n'existait pas encore).
 */
export async function setMark(gridId, userId, studentId, criterionId, payload) {
  await assertGridExists(gridId, userId);
  const student = await get("SELECT id FROM students WHERE id = ? AND grid_id = ?", [studentId, gridId]);
  if (!student) throw notFound("Élève introuvable dans cette grille.");
  const criterion = await get("SELECT id FROM criteria WHERE id = ? AND grid_id = ?", [criterionId, gridId]);
  if (!criterion) throw notFound("Critère introuvable dans cette grille.");

  const current = await get(
    "SELECT level_position, comment FROM marks WHERE student_id = ? AND criterion_id = ?",
    [studentId, criterionId]
  );

  const levelPosition = payload.levelPosition !== undefined ? payload.levelPosition : current?.level_position ?? 0;
  const comment = payload.comment !== undefined ? payload.comment : current?.comment ?? "";

  await run(
    `INSERT INTO marks (student_id, criterion_id, level_position, comment) VALUES (?, ?, ?, ?)
     ON CONFLICT (student_id, criterion_id)
     DO UPDATE SET level_position = excluded.level_position, comment = excluded.comment`,
    [studentId, criterionId, levelPosition, comment]
  );

  return { studentId, criterionId, levelPosition, comment };
}

/** Applique le même niveau à tous les membres d'un groupe pour un critère donné. */
export async function setGroupMark(gridId, userId, groupId, criterionId, levelPosition) {
  await assertGridExists(gridId, userId);
  const group = await get("SELECT id FROM `groups` WHERE id = ? AND grid_id = ?", [groupId, gridId]);
  if (!group) throw notFound("Groupe introuvable dans cette grille.");
  const criterion = await get("SELECT id FROM criteria WHERE id = ? AND grid_id = ?", [criterionId, gridId]);
  if (!criterion) throw notFound("Critère introuvable dans cette grille.");

  const members = await all("SELECT id FROM students WHERE group_id = ?", [groupId]);
  await batch(
    members.map((m) => ({
      sql: `INSERT INTO marks (student_id, criterion_id, level_position) VALUES (?, ?, ?)
            ON CONFLICT (student_id, criterion_id) DO UPDATE SET level_position = excluded.level_position`,
      args: [m.id, criterionId, levelPosition],
    }))
  );

  return { groupId, criterionId, levelPosition, studentIds: members.map((m) => m.id) };
}
