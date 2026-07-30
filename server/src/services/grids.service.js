import { randomUUID } from "node:crypto";
import { pool } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

export async function listGrids(userId) {
  const [rows] = await pool.query(
    `SELECT g.id, g.name, g.created_at,
            (SELECT COUNT(*) FROM criteria c WHERE c.grid_id = g.id) AS criteria_count,
            (SELECT COUNT(*) FROM students s WHERE s.grid_id = g.id) AS students_count
     FROM grids g
     WHERE g.user_id = ?
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getGrid(id, userId) {
  const [[grid]] = await pool.query(
    "SELECT id, name, created_at FROM grids WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  if (!grid) throw notFound("Grille introuvable.");
  const [levels] = await pool.query(
    "SELECT id, position, label, pct FROM levels WHERE grid_id = ? ORDER BY position",
    [id]
  );
  const [categories] = await pool.query(
    "SELECT id, position, name FROM categories WHERE grid_id = ? ORDER BY position",
    [id]
  );
  const [criteria] = await pool.query(
    "SELECT id, category_id, position, name, weight FROM criteria WHERE grid_id = ? ORDER BY position",
    [id]
  );
  grid.levels = levels;
  grid.categories = categories;
  grid.criteria = criteria;
  return grid;
}

async function insertGridContents(conn, gridId, payload) {
  for (const [i, l] of payload.levels.entries()) {
    await conn.query(
      "INSERT INTO levels (id, grid_id, position, label, pct) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), gridId, i, l.label, l.pct]
    );
  }

  const categoryIds = [];
  for (const [i, cat] of payload.categories.entries()) {
    const categoryId = randomUUID();
    await conn.query(
      "INSERT INTO categories (id, grid_id, position, name) VALUES (?, ?, ?, ?)",
      [categoryId, gridId, i, cat.name]
    );
    categoryIds.push(categoryId);
  }

  for (const [i, c] of payload.criteria.entries()) {
    await conn.query(
      "INSERT INTO criteria (id, grid_id, category_id, position, name, weight) VALUES (?, ?, ?, ?, ?, ?)",
      [randomUUID(), gridId, categoryIds[c.categoryIndex], i, c.name, c.weight]
    );
  }
}

/** Création transactionnelle : grille + niveaux + catégories + critères. */
export async function createGrid(userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const gridId = randomUUID();
    await conn.query("INSERT INTO grids (id, user_id, name) VALUES (?, ?, ?)", [gridId, userId, payload.name]);
    await insertGridContents(conn, gridId, payload);
    await conn.commit();
    return await getGrid(gridId, userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Mise à jour transactionnelle : remplace niveaux, catégories et critères. */
export async function updateGrid(id, userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[existing]] = await conn.query("SELECT id FROM grids WHERE id = ? AND user_id = ?", [id, userId]);
    if (!existing) throw notFound("Grille introuvable.");

    await conn.query("UPDATE grids SET name = ? WHERE id = ?", [payload.name, id]);
    await conn.query("DELETE FROM levels WHERE grid_id = ?", [id]);
    await conn.query("DELETE FROM categories WHERE grid_id = ?", [id]); // cascade → criteria
    await insertGridContents(conn, id, payload);

    await conn.commit();
    return await getGrid(id, userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Duplique une grille (niveaux, catégories, critères) sans ses élèves/notes. */
export async function duplicateGrid(id, userId) {
  const grid = await getGrid(id, userId);
  return createGrid(userId, {
    name: `${grid.name} (copie)`,
    levels: grid.levels.map((l) => ({ label: l.label, pct: l.pct })),
    categories: grid.categories.map((cat) => ({ name: cat.name })),
    criteria: grid.criteria.map((c) => ({
      name: c.name,
      weight: c.weight,
      categoryIndex: grid.categories.findIndex((cat) => cat.id === c.category_id),
    })),
  });
}

export async function deleteGrid(id, userId) {
  const [{ affectedRows }] = await pool.query("DELETE FROM grids WHERE id = ? AND user_id = ?", [id, userId]);
  if (affectedRows === 0) throw notFound("Grille introuvable.");
}
