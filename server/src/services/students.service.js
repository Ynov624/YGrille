import { randomUUID } from "node:crypto";
import { pool } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

const STUDENT_FIELDS = "id, last_name, first_name, comment, group_id";

async function assertGridExists(gridId, userId) {
  const [[grid]] = await pool.query("SELECT id FROM grids WHERE id = ? AND user_id = ?", [gridId, userId]);
  if (!grid) throw notFound("Grille introuvable.");
}

export async function listStudents(gridId, userId) {
  await assertGridExists(gridId, userId);
  const [rows] = await pool.query(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE grid_id = ? ORDER BY last_name, first_name`,
    [gridId]
  );
  return rows;
}

export async function createStudent(gridId, userId, payload) {
  await assertGridExists(gridId, userId);
  const id = randomUUID();
  await pool.query(
    "INSERT INTO students (id, grid_id, last_name, first_name) VALUES (?, ?, ?, ?)",
    [id, gridId, payload.lastName, payload.firstName]
  );
  const [[student]] = await pool.query(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
  return student;
}

/** Import en masse (ex. CSV) : ajoute les élèves à la liste existante de la grille. */
export async function importStudents(gridId, userId, entries) {
  await assertGridExists(gridId, userId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of entries) {
      await conn.query(
        "INSERT INTO students (id, grid_id, last_name, first_name) VALUES (?, ?, ?, ?)",
        [randomUUID(), gridId, s.lastName, s.firstName]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return listStudents(gridId, userId);
}

export async function updateStudent(gridId, userId, id, payload) {
  await assertGridExists(gridId, userId);
  const [[current]] = await pool.query(
    `SELECT ${STUDENT_FIELDS} FROM students WHERE id = ? AND grid_id = ?`,
    [id, gridId]
  );
  if (!current) throw notFound("Élève introuvable.");
  const comment = payload.comment !== undefined ? payload.comment : current.comment;
  await pool.query(
    "UPDATE students SET last_name = ?, first_name = ?, comment = ? WHERE id = ? AND grid_id = ?",
    [payload.lastName, payload.firstName, comment, id, gridId]
  );
  const [[student]] = await pool.query(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
  return student;
}

export async function deleteStudent(gridId, userId, id) {
  await assertGridExists(gridId, userId);
  const [{ affectedRows }] = await pool.query(
    "DELETE FROM students WHERE id = ? AND grid_id = ?",
    [id, gridId]
  );
  if (affectedRows === 0) throw notFound("Élève introuvable.");
}

export async function setStudentGroup(gridId, userId, id, groupId) {
  await assertGridExists(gridId, userId);
  if (groupId) {
    const [[group]] = await pool.query(
      "SELECT id FROM `groups` WHERE id = ? AND grid_id = ?",
      [groupId, gridId]
    );
    if (!group) throw notFound("Groupe introuvable dans cette grille.");
  }
  const [{ affectedRows }] = await pool.query(
    "UPDATE students SET group_id = ? WHERE id = ? AND grid_id = ?",
    [groupId, id, gridId]
  );
  if (affectedRows === 0) throw notFound("Élève introuvable.");
  const [[student]] = await pool.query(`SELECT ${STUDENT_FIELDS} FROM students WHERE id = ?`, [id]);
  return student;
}
