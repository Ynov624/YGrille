import { randomUUID } from "node:crypto";
import { all, get, run, batch } from "../db/connection.js";
import { notFound } from "../utils/errors.js";

export async function listGrids(userId) {
  return all(
    `SELECT g.id, g.name, g.created_at,
            (SELECT COUNT(*) FROM criteria c WHERE c.grid_id = g.id) AS criteria_count,
            (SELECT COUNT(*) FROM students s WHERE s.grid_id = g.id) AS students_count
     FROM grids g
     WHERE g.user_id = ?
     ORDER BY g.created_at DESC`,
    [userId]
  );
}

export async function getGrid(id, userId) {
  const grid = await get("SELECT id, name, created_at FROM grids WHERE id = ? AND user_id = ?", [id, userId]);
  if (!grid) throw notFound("Grille introuvable.");
  // Lectures indépendantes lancées en parallèle : chacune est un aller-retour HTTP vers Turso.
  const [levels, categories, criteria] = await Promise.all([
    all("SELECT id, position, label, pct FROM levels WHERE grid_id = ? ORDER BY position", [id]),
    all("SELECT id, position, name, deliverable FROM categories WHERE grid_id = ? ORDER BY position", [id]),
    all("SELECT id, category_id, position, name, weight FROM criteria WHERE grid_id = ? ORDER BY position", [id]),
  ]);
  grid.levels = levels;
  grid.categories = categories;
  grid.criteria = criteria;
  return grid;
}

/** Insertions des niveaux, catégories et critères d'une grille, à exécuter dans le même lot. */
function gridContentsStatements(gridId, payload) {
  const levels = payload.levels.map((l, i) => ({
    sql: "INSERT INTO levels (id, grid_id, position, label, pct) VALUES (?, ?, ?, ?, ?)",
    args: [randomUUID(), gridId, i, l.label, l.pct],
  }));

  const categoryIds = payload.categories.map(() => randomUUID());
  const categories = payload.categories.map((cat, i) => ({
    sql: "INSERT INTO categories (id, grid_id, position, name, deliverable) VALUES (?, ?, ?, ?, ?)",
    args: [categoryIds[i], gridId, i, cat.name, cat.deliverable],
  }));

  const criteria = payload.criteria.map((c, i) => ({
    sql: "INSERT INTO criteria (id, grid_id, category_id, position, name, weight) VALUES (?, ?, ?, ?, ?, ?)",
    args: [randomUUID(), gridId, categoryIds[c.categoryIndex], i, c.name, c.weight],
  }));

  return [...levels, ...categories, ...criteria];
}

/** Création atomique (un seul lot) : grille + niveaux + catégories + critères. */
export async function createGrid(userId, payload) {
  const gridId = randomUUID();
  await batch([
    { sql: "INSERT INTO grids (id, user_id, name) VALUES (?, ?, ?)", args: [gridId, userId, payload.name] },
    ...gridContentsStatements(gridId, payload),
  ]);
  return getGrid(gridId, userId);
}

/** Mise à jour atomique (un seul lot) : remplace niveaux, catégories et critères. */
export async function updateGrid(id, userId, payload) {
  const existing = await get("SELECT id FROM grids WHERE id = ? AND user_id = ?", [id, userId]);
  if (!existing) throw notFound("Grille introuvable.");

  await batch([
    { sql: "UPDATE grids SET name = ? WHERE id = ?", args: [payload.name, id] },
    { sql: "DELETE FROM levels WHERE grid_id = ?", args: [id] },
    { sql: "DELETE FROM categories WHERE grid_id = ?", args: [id] }, // cascade → criteria
    ...gridContentsStatements(id, payload),
  ]);
  return getGrid(id, userId);
}

/** Duplique une grille (niveaux, catégories, critères) sans ses élèves/notes. */
export async function duplicateGrid(id, userId) {
  const grid = await getGrid(id, userId);
  return createGrid(userId, {
    name: `${grid.name} (copie)`,
    levels: grid.levels.map((l) => ({ label: l.label, pct: l.pct })),
    categories: grid.categories.map((cat) => ({ name: cat.name, deliverable: cat.deliverable })),
    criteria: grid.criteria.map((c) => ({
      name: c.name,
      weight: c.weight,
      categoryIndex: grid.categories.findIndex((cat) => cat.id === c.category_id),
    })),
  });
}

export async function deleteGrid(id, userId) {
  const affectedRows = await run("DELETE FROM grids WHERE id = ? AND user_id = ?", [id, userId]);
  if (affectedRows === 0) throw notFound("Grille introuvable.");
}
