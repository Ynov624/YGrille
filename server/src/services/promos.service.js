import { randomUUID } from "node:crypto";
import { pool } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

const STUDENT_FIELDS = "id, last_name, first_name";

/** Liste légère (nom + effectif), utilisée par le sélecteur de promo à l'import dans une grille. */
export async function listPromos() {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.created_at,
            (SELECT COUNT(*) FROM promo_students ps WHERE ps.promo_id = p.id) AS students_count
     FROM promos p
     ORDER BY p.name`
  );
  return rows;
}

async function assertPromoExists(id) {
  const [[promo]] = await pool.query("SELECT id FROM promos WHERE id = ?", [id]);
  if (!promo) throw notFound("Promo introuvable.");
}

export async function getPromo(id) {
  const [[promo]] = await pool.query("SELECT id, name, created_at FROM promos WHERE id = ?", [id]);
  if (!promo) throw notFound("Promo introuvable.");
  const [students] = await pool.query(
    `SELECT ${STUDENT_FIELDS} FROM promo_students WHERE promo_id = ? ORDER BY last_name, first_name`,
    [id]
  );
  promo.students = students;
  return promo;
}

export async function createPromo(name) {
  const id = randomUUID();
  await pool.query("INSERT INTO promos (id, name) VALUES (?, ?)", [id, name]);
  return getPromo(id);
}

export async function renamePromo(id, name) {
  const [{ affectedRows }] = await pool.query("UPDATE promos SET name = ? WHERE id = ?", [name, id]);
  if (affectedRows === 0) throw notFound("Promo introuvable.");
  return getPromo(id);
}

export async function deletePromo(id) {
  const [{ affectedRows }] = await pool.query("DELETE FROM promos WHERE id = ?", [id]);
  if (affectedRows === 0) throw notFound("Promo introuvable.");
}

export async function addPromoStudent(promoId, payload) {
  await assertPromoExists(promoId);
  const id = randomUUID();
  await pool.query(
    "INSERT INTO promo_students (id, promo_id, last_name, first_name) VALUES (?, ?, ?, ?)",
    [id, promoId, payload.lastName, payload.firstName]
  );
  const [[student]] = await pool.query(`SELECT ${STUDENT_FIELDS} FROM promo_students WHERE id = ?`, [id]);
  return student;
}

/** Import en masse (ex. CSV) : ajoute les élèves à la liste existante de la promo. */
export async function importPromoStudents(promoId, entries) {
  await assertPromoExists(promoId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const s of entries) {
      await conn.query(
        "INSERT INTO promo_students (id, promo_id, last_name, first_name) VALUES (?, ?, ?, ?)",
        [randomUUID(), promoId, s.lastName, s.firstName]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return getPromo(promoId);
}

export async function updatePromoStudent(promoId, id, payload) {
  const [{ affectedRows }] = await pool.query(
    "UPDATE promo_students SET last_name = ?, first_name = ? WHERE id = ? AND promo_id = ?",
    [payload.lastName, payload.firstName, id, promoId]
  );
  if (affectedRows === 0) throw notFound("Élève introuvable.");
  const [[student]] = await pool.query(`SELECT ${STUDENT_FIELDS} FROM promo_students WHERE id = ?`, [id]);
  return student;
}

export async function deletePromoStudent(promoId, id) {
  const [{ affectedRows }] = await pool.query(
    "DELETE FROM promo_students WHERE id = ? AND promo_id = ?",
    [id, promoId]
  );
  if (affectedRows === 0) throw notFound("Élève introuvable.");
}

/** Élèves d'une promo, sous la forme attendue par students.service#importStudents. */
export async function listPromoStudentsForImport(promoId) {
  await assertPromoExists(promoId);
  const [rows] = await pool.query(
    "SELECT last_name AS lastName, first_name AS firstName FROM promo_students WHERE promo_id = ? ORDER BY last_name, first_name",
    [promoId]
  );
  return rows;
}
