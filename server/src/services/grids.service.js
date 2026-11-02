import { randomUUID } from "node:crypto";
import { all, get, run, batch } from "../db/connection.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

/** Vérifie l'accès d'un utilisateur à une grille et retourne son rôle ('owner' | 'editor'). */
export async function assertGridAccess(gridId, userId, requiredRole = null) {
  const membership = await get("SELECT role FROM grid_users WHERE grid_id = ? AND user_id = ?", [
    gridId,
    userId,
  ]);
  if (!membership) throw notFound("Grille introuvable.");
  if (requiredRole && membership.role !== requiredRole) {
    throw forbidden("Action réservée au propriétaire de la grille.");
  }
  return membership.role;
}

export async function listGrids(userId) {
  return all(
    `SELECT g.id, g.name, g.created_at, gu.role,
            (SELECT COUNT(*) FROM grid_users WHERE grid_id = g.id) AS members_count,
            (SELECT COUNT(*) FROM criteria c WHERE c.grid_id = g.id) AS criteria_count,
            (SELECT COUNT(*) FROM students s WHERE s.grid_id = g.id) AS students_count
     FROM grids g
     JOIN grid_users gu ON gu.grid_id = g.id
     WHERE gu.user_id = ?
     ORDER BY g.created_at DESC`,
    [userId]
  );
}

export async function getGrid(id, userId) {
  const role = await assertGridAccess(id, userId);
  const grid = await get("SELECT id, name, created_at FROM grids WHERE id = ?", [id]);
  if (!grid) throw notFound("Grille introuvable.");

  // Lectures indépendantes lancées en parallèle : chacune est un aller-retour HTTP vers Turso.
  const [levels, categories, criteria] = await Promise.all([
    all("SELECT id, position, label, pct FROM levels WHERE grid_id = ? ORDER BY position", [id]),
    all(
      "SELECT id, position, name, deliverable FROM categories WHERE grid_id = ? ORDER BY position",
      [id]
    ),
    all(
      "SELECT id, category_id, position, name, weight FROM criteria WHERE grid_id = ? ORDER BY position",
      [id]
    ),
  ]);
  grid.role = role;
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

/** Création atomique (un seul lot) : grille + membre propriétaire + niveaux + catégories + critères. */
export async function createGrid(userId, payload) {
  const gridId = randomUUID();
  await batch([
    {
      sql: "INSERT INTO grids (id, name) VALUES (?, ?)",
      args: [gridId, payload.name],
    },
    {
      sql: "INSERT INTO grid_users (grid_id, user_id, role) VALUES (?, ?, 'owner')",
      args: [gridId, userId],
    },
    ...gridContentsStatements(gridId, payload),
  ]);
  return getGrid(gridId, userId);
}

/** Mise à jour différentielle atomique : préserve les identifiants et les notes existantes. */
export async function updateGrid(id, userId, payload) {
  await assertGridAccess(id, userId, "owner");

  const [currentCategories, currentCriteria] = await Promise.all([
    all("SELECT id FROM categories WHERE grid_id = ?", [id]),
    all("SELECT id FROM criteria WHERE grid_id = ?", [id]),
  ]);

  const currentCatIds = new Set(currentCategories.map((c) => c.id));
  const currentCritIds = new Set(currentCriteria.map((c) => c.id));

  // Préserve l'ID existant ou génère un nouvel UUID
  const categoryIds = payload.categories.map((cat) =>
    cat.id && currentCatIds.has(cat.id) ? cat.id : randomUUID()
  );
  const nextCatIdSet = new Set(categoryIds);

  const criteriaIds = payload.criteria.map((crit) =>
    crit.id && currentCritIds.has(crit.id) ? crit.id : randomUUID()
  );
  const nextCritIdSet = new Set(criteriaIds);

  const statements = [];

  // 1. Mise à jour du nom
  statements.push({
    sql: "UPDATE grids SET name = ? WHERE id = ?",
    args: [payload.name, id],
  });

  // 2. Mise à jour des niveaux (positions 0..4)
  payload.levels.forEach((l, i) => {
    statements.push({
      sql: "UPDATE levels SET label = ?, pct = ? WHERE grid_id = ? AND position = ?",
      args: [l.label, l.pct, id, i],
    });
  });

  // 3. Suppression des critères retirés de la grille
  for (const crit of currentCriteria) {
    if (!nextCritIdSet.has(crit.id)) {
      statements.push({
        sql: "DELETE FROM criteria WHERE id = ?",
        args: [crit.id],
      });
    }
  }

  // 4. Suppression des catégories retirées de la grille (cascade sur leurs critères)
  for (const cat of currentCategories) {
    if (!nextCatIdSet.has(cat.id)) {
      statements.push({
        sql: "DELETE FROM categories WHERE id = ?",
        args: [cat.id],
      });
    }
  }

  // 5. Décalage temporaire des positions des catégories pour éviter les conflits d'unicité UNIQUE(grid_id, position)
  statements.push({
    sql: "UPDATE categories SET position = -position - 1 WHERE grid_id = ?",
    args: [id],
  });

  // 6. Mise à jour ou insertion des catégories
  payload.categories.forEach((cat, i) => {
    const catId = categoryIds[i];
    if (currentCatIds.has(catId)) {
      statements.push({
        sql: "UPDATE categories SET position = ?, name = ?, deliverable = ? WHERE id = ?",
        args: [i, cat.name, cat.deliverable, catId],
      });
    } else {
      statements.push({
        sql: "INSERT INTO categories (id, grid_id, position, name, deliverable) VALUES (?, ?, ?, ?, ?)",
        args: [catId, id, i, cat.name, cat.deliverable],
      });
    }
  });

  // 7. Mise à jour ou insertion des critères
  payload.criteria.forEach((crit, i) => {
    const critId = criteriaIds[i];
    const catId = categoryIds[crit.categoryIndex];
    if (currentCritIds.has(critId)) {
      statements.push({
        sql: "UPDATE criteria SET category_id = ?, position = ?, name = ?, weight = ? WHERE id = ?",
        args: [catId, i, crit.name, crit.weight, critId],
      });
    } else {
      statements.push({
        sql: "INSERT INTO criteria (id, grid_id, category_id, position, name, weight) VALUES (?, ?, ?, ?, ?, ?)",
        args: [critId, id, catId, i, crit.name, crit.weight],
      });
    }
  });

  await batch(statements);
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
  await assertGridAccess(id, userId, "owner");
  await run("DELETE FROM grids WHERE id = ?", [id]);
}

/** Liste les collaborateurs d'une grille. */
export async function listGridMembers(gridId, userId) {
  await assertGridAccess(gridId, userId);
  return all(
    `SELECT u.id, u.email, u.name, gu.role, gu.created_at
     FROM grid_users gu
     JOIN users u ON u.id = gu.user_id
     WHERE gu.grid_id = ?
     ORDER BY
       CASE gu.role WHEN 'owner' THEN 0 ELSE 1 END,
       u.name,
       u.email`,
    [gridId]
  );
}

/** Ajoute un collaborateur à la grille (réservé aux propriétaires). */
export async function addGridMember(gridId, currentUserId, payload) {
  await assertGridAccess(gridId, currentUserId, "owner");
  const user = await get("SELECT id, email, name FROM users WHERE email = ?", [payload.email]);
  if (!user) {
    throw badRequest(
      "Impossible d'ajouter cet utilisateur. Vérifiez l'adresse ou demandez-lui de créer son compte."
    );
  }
  const existing = await get("SELECT role FROM grid_users WHERE grid_id = ? AND user_id = ?", [
    gridId,
    user.id,
  ]);
  if (existing) {
    throw badRequest("Cet utilisateur est déjà membre de cette grille.");
  }
  await run("INSERT INTO grid_users (grid_id, user_id, role) VALUES (?, ?, ?)", [
    gridId,
    user.id,
    payload.role,
  ]);
  return listGridMembers(gridId, currentUserId);
}

/** Modifie le rôle d'un collaborateur (réservé aux propriétaires, protège le dernier propriétaire). */
export async function updateGridMemberRole(gridId, currentUserId, targetUserId, payload) {
  await assertGridAccess(gridId, currentUserId, "owner");
  const target = await get("SELECT role FROM grid_users WHERE grid_id = ? AND user_id = ?", [
    gridId,
    targetUserId,
  ]);
  if (!target) throw notFound("Membre introuvable dans cette grille.");

  if (target.role === "owner" && payload.role !== "owner") {
    const ownerCount = await get(
      "SELECT COUNT(*) AS count FROM grid_users WHERE grid_id = ? AND role = 'owner'",
      [gridId]
    );
    if (ownerCount.count <= 1) {
      throw badRequest(
        "Impossible de rétrograder le seul propriétaire de la grille. Désignez un autre propriétaire au préalable."
      );
    }
  }

  await run("UPDATE grid_users SET role = ? WHERE grid_id = ? AND user_id = ?", [
    payload.role,
    gridId,
    targetUserId,
  ]);
  return listGridMembers(gridId, currentUserId);
}

/** Retire un collaborateur (réservé aux propriétaires ou retrait de soi-même). */
export async function removeGridMember(gridId, currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    return leaveGrid(gridId, currentUserId);
  }
  await assertGridAccess(gridId, currentUserId, "owner");
  const target = await get("SELECT role FROM grid_users WHERE grid_id = ? AND user_id = ?", [
    gridId,
    targetUserId,
  ]);
  if (!target) throw notFound("Membre introuvable dans cette grille.");

  if (target.role === "owner") {
    const ownerCount = await get(
      "SELECT COUNT(*) AS count FROM grid_users WHERE grid_id = ? AND role = 'owner'",
      [gridId]
    );
    if (ownerCount.count <= 1) {
      throw badRequest("Impossible de retirer le seul propriétaire de la grille.");
    }
  }

  await run("DELETE FROM grid_users WHERE grid_id = ? AND user_id = ?", [gridId, targetUserId]);
}

/** Quitte une grille partagée (interdit si seul propriétaire). */
export async function leaveGrid(gridId, userId) {
  const role = await assertGridAccess(gridId, userId);
  if (role === "owner") {
    const ownerCount = await get(
      "SELECT COUNT(*) AS count FROM grid_users WHERE grid_id = ? AND role = 'owner'",
      [gridId]
    );
    if (ownerCount.count <= 1) {
      throw badRequest(
        "Vous êtes le seul propriétaire de la grille. Désignez un autre propriétaire avant de la quitter ou supprimez-la."
      );
    }
  }
  await run("DELETE FROM grid_users WHERE grid_id = ? AND user_id = ?", [gridId, userId]);
}
