import { randomUUID } from "node:crypto";
import { all, get, run, batch } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

const STUDENT_FIELDS = "id, last_name, first_name";

/** Liste légère (nom + effectif), utilisée par le sélecteur de promo à l'import dans une grille. */
export async function listPromos() {
  return all(
    `SELECT p.id, p.name, p.created_at,
            (SELECT COUNT(*) FROM promo_students ps WHERE ps.promo_id = p.id) AS students_count
     FROM promos p
     ORDER BY p.name`
  );
}

async function assertPromoExists(id) {
  const promo = await get("SELECT id FROM promos WHERE id = ?", [id]);
  if (!promo) throw notFound("Promo introuvable.");
}

export async function getPromo(id) {
  const promo = await get("SELECT id, name, created_at FROM promos WHERE id = ?", [id]);
  if (!promo) throw notFound("Promo introuvable.");
  promo.students = await all(
    `SELECT ${STUDENT_FIELDS} FROM promo_students WHERE promo_id = ? ORDER BY last_name, first_name`,
    [id]
  );
  return promo;
}

export async function createPromo(name) {
  const id = randomUUID();
  await run("INSERT INTO promos (id, name) VALUES (?, ?)", [id, name]);
  return getPromo(id);
}

export async function renamePromo(id, name) {
  const affectedRows = await run("UPDATE promos SET name = ? WHERE id = ?", [name, id]);
  if (affectedRows === 0) throw notFound("Promo introuvable.");
  return getPromo(id);
}

export async function deletePromo(id) {
  const affectedRows = await run("DELETE FROM promos WHERE id = ?", [id]);
  if (affectedRows === 0) throw notFound("Promo introuvable.");
}

export async function addPromoStudent(promoId, payload) {
  await assertPromoExists(promoId);
  const id = randomUUID();
  await run(
    "INSERT INTO promo_students (id, promo_id, last_name, first_name) VALUES (?, ?, ?, ?)",
    [id, promoId, payload.lastName, payload.firstName]
  );
  return get(`SELECT ${STUDENT_FIELDS} FROM promo_students WHERE id = ?`, [id]);
}

/** Import en masse (ex. CSV) : ajoute les élèves à la liste existante de la promo, en un seul lot. */
export async function importPromoStudents(promoId, entries) {
  await assertPromoExists(promoId);
  await batch(
    entries.map((s) => ({
      sql: "INSERT INTO promo_students (id, promo_id, last_name, first_name) VALUES (?, ?, ?, ?)",
      args: [randomUUID(), promoId, s.lastName, s.firstName],
    }))
  );
  return getPromo(promoId);
}

export async function updatePromoStudent(promoId, id, payload) {
  const affectedRows = await run(
    "UPDATE promo_students SET last_name = ?, first_name = ? WHERE id = ? AND promo_id = ?",
    [payload.lastName, payload.firstName, id, promoId]
  );
  if (affectedRows === 0) throw notFound("Élève introuvable.");
  return get(`SELECT ${STUDENT_FIELDS} FROM promo_students WHERE id = ?`, [id]);
}

export async function deletePromoStudent(promoId, id) {
  const affectedRows = await run("DELETE FROM promo_students WHERE id = ? AND promo_id = ?", [id, promoId]);
  if (affectedRows === 0) throw notFound("Élève introuvable.");
}

/** Élèves d'une promo, sous la forme attendue par students.service#importStudents. */
export async function listPromoStudentsForImport(promoId) {
  await assertPromoExists(promoId);
  return all(
    "SELECT last_name AS lastName, first_name AS firstName FROM promo_students WHERE promo_id = ? ORDER BY last_name, first_name",
    [promoId]
  );
}
