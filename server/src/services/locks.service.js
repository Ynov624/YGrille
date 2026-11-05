import { all, run, batch } from "../db/connection.js";
import { assertGridAccess } from "./grids.service.js";
import { forbidden, locked } from "../utils/errors.js";

/**
 * Retourne la liste des verrous actifs d'une grille (expires_at > Date.now()).
 * Lecture pure : aucun DELETE opportuniste pour ne pas pénaliser le polling HTTP.
 */
export async function listActiveLocks(gridId, userId) {
  await assertGridAccess(gridId, userId);
  const now = Date.now();
  return all(
    "SELECT lock_key, user_id, user_name, expires_at FROM field_locks WHERE grid_id = ? AND expires_at > ?",
    [gridId, now]
  );
}

/**
 * Acquiert ou renouvelle un ensemble de clés pour l'utilisateur courant.
 * Transaction atomique :
 * 1. Nettoyage opportuniste des verrous expirés sur cette grille (en écriture uniquement).
 * 2. Vérification des conflits avec d'autres utilisateurs actifs.
 * 3. Upsert conditionnel atomique pour chaque clé.
 * Si un conflit intervient (TOCTOU), l'opération est rejetée sans verrou partiel.
 */
export async function acquireOrRenewLocks(gridId, keys, userId, userName, ttlSeconds = 90) {
  const role = await assertGridAccess(gridId, userId);
  if (!keys?.length) return { acquired: true, expiresAt: 0 };

  if (keys.includes("grid:structure") && role !== "owner") {
    throw forbidden("Action réservée au propriétaire de la grille.");
  }

  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  // Nettoyage opportuniste en écriture uniquement
  await run("DELETE FROM field_locks WHERE grid_id = ? AND expires_at <= ?", [gridId, now]);

  // Vérification de conflit actif avec d'autres utilisateurs
  const placeholders = keys.map(() => "?").join(",");
  const conflict = await all(
    `SELECT lock_key, user_name, expires_at FROM field_locks
     WHERE grid_id = ? AND lock_key IN (${placeholders}) AND user_id != ? AND expires_at > ?
     LIMIT 1`,
    [gridId, ...keys, userId, now]
  );

  if (conflict.length > 0) {
    return {
      acquired: false,
      lockedBy: conflict[0].user_name,
      expiresAt: conflict[0].expires_at,
    };
  }

  // Upsert conditionnel en lot (atomic batch)
  const statements = keys.map((key) => ({
    sql: `INSERT INTO field_locks (grid_id, lock_key, user_id, user_name, expires_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(grid_id, lock_key) DO UPDATE SET
            user_id = excluded.user_id,
            user_name = excluded.user_name,
            expires_at = excluded.expires_at
          WHERE field_locks.user_id = excluded.user_id OR field_locks.expires_at <= ?`,
    args: [gridId, key, userId, userName, expiresAt, now],
  }));

  const results = await batch(statements);

  // Vérifier qu'aucune instruction n'a échoué suite à une concurrence TOCTOU
  const hasConflict = results.some((r) => r.rowsAffected === 0);
  if (hasConflict) {
    // Annuler uniquement les clés qui ont été insérées ou mises à jour dans ce lot
    await run(
      `DELETE FROM field_locks WHERE grid_id = ? AND user_id = ? AND expires_at = ? AND lock_key IN (${placeholders})`,
      [gridId, userId, expiresAt, ...keys]
    );
    return { acquired: false, lockedBy: "Un collaborateur", expiresAt: 0 };
  }

  return { acquired: true, expiresAt };
}

/**
 * Libère explicitement un ensemble de verrous détenus par l'utilisateur courant.
 */
export async function releaseLocks(gridId, keys, userId) {
  if (!keys?.length) return;
  const placeholders = keys.map(() => "?").join(",");
  await run(
    `DELETE FROM field_locks WHERE grid_id = ? AND user_id = ? AND lock_key IN (${placeholders})`,
    [gridId, userId, ...keys]
  );
}

/**
 * Vérifie qu'aucun verrou actif d'un autre utilisateur n'interdit l'écriture sur les clés demandées.
 * Inclut automatiquement "grid:structure" pour suspendre les évaluations pendant la modification du barème.
 */
export async function assertLockPermitted(gridId, keys, userId) {
  if (!keys?.length) return;
  const now = Date.now();
  const allKeys = keys.includes("grid:structure") ? keys : [...keys, "grid:structure"];
  const placeholders = allKeys.map(() => "?").join(",");

  const [activeConflict] = await all(
    `SELECT lock_key, user_name FROM field_locks
     WHERE grid_id = ? AND lock_key IN (${placeholders}) AND user_id != ? AND expires_at > ?
     LIMIT 1`,
    [gridId, ...allKeys, userId, now]
  );

  if (activeConflict) {
    const target =
      activeConflict.lock_key === "grid:structure"
        ? "La structure du barème est en cours de modification par "
        : "Ce champ est actuellement verrouillé par ";
    throw locked(`${target}${activeConflict.user_name}.`, [
      { lockKey: activeConflict.lock_key, userName: activeConflict.user_name },
    ]);
  }
}
