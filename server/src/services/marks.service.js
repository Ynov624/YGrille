import { pool } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

async function assertGridExists(gridId, userId) {
  const [[grid]] = await pool.query("SELECT id FROM grids WHERE id = ? AND user_id = ?", [gridId, userId]);
  if (!grid) throw notFound("Grille introuvable.");
}

export async function listMarks(gridId, userId) {
  await assertGridExists(gridId, userId);
  const [rows] = await pool.query(
    `SELECT m.student_id, m.criterion_id, m.level_position, m.comment
     FROM marks m
     JOIN students s ON s.id = m.student_id
     WHERE s.grid_id = ?`,
    [gridId]
  );
  return rows;
}

/**
 * Met à jour (partiellement) la note d'un élève sur un critère : niveau et/ou
 * appréciation. Les champs absents du payload conservent leur valeur actuelle
 * (ou leur valeur par défaut si la note n'existait pas encore).
 */
export async function setMark(gridId, userId, studentId, criterionId, payload) {
  await assertGridExists(gridId, userId);
  const [[student]] = await pool.query(
    "SELECT id FROM students WHERE id = ? AND grid_id = ?",
    [studentId, gridId]
  );
  if (!student) throw notFound("Élève introuvable dans cette grille.");
  const [[criterion]] = await pool.query(
    "SELECT id FROM criteria WHERE id = ? AND grid_id = ?",
    [criterionId, gridId]
  );
  if (!criterion) throw notFound("Critère introuvable dans cette grille.");

  const [[current]] = await pool.query(
    "SELECT level_position, comment FROM marks WHERE student_id = ? AND criterion_id = ?",
    [studentId, criterionId]
  );

  const levelPosition = payload.levelPosition !== undefined ? payload.levelPosition : current?.level_position ?? 0;
  const comment = payload.comment !== undefined ? payload.comment : current?.comment ?? "";

  await pool.query(
    `INSERT INTO marks (student_id, criterion_id, level_position, comment) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE level_position = VALUES(level_position), comment = VALUES(comment)`,
    [studentId, criterionId, levelPosition, comment]
  );

  return { studentId, criterionId, levelPosition, comment };
}

/** Applique le même niveau à tous les membres d'un groupe pour un critère donné. */
export async function setGroupMark(gridId, userId, groupId, criterionId, levelPosition) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[grid]] = await conn.query("SELECT id FROM grids WHERE id = ? AND user_id = ?", [gridId, userId]);
    if (!grid) throw notFound("Grille introuvable.");

    const [[group]] = await conn.query(
      "SELECT id FROM `groups` WHERE id = ? AND grid_id = ?",
      [groupId, gridId]
    );
    if (!group) throw notFound("Groupe introuvable dans cette grille.");

    const [[criterion]] = await conn.query(
      "SELECT id FROM criteria WHERE id = ? AND grid_id = ?",
      [criterionId, gridId]
    );
    if (!criterion) throw notFound("Critère introuvable dans cette grille.");

    const [members] = await conn.query("SELECT id FROM students WHERE group_id = ?", [groupId]);
    for (const m of members) {
      await conn.query(
        `INSERT INTO marks (student_id, criterion_id, level_position) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE level_position = VALUES(level_position)`,
        [m.id, criterionId, levelPosition]
      );
    }

    await conn.commit();
    return { groupId, criterionId, levelPosition, studentIds: members.map((m) => m.id) };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
