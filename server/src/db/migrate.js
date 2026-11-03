import "dotenv/config";
import { pathToFileURL } from "node:url";
import { all, run } from "./connection.js";

export async function migrate() {
  console.log("Starting database migration...");

  // 1. Assurer la création de la table grid_users
  await run(`
    CREATE TABLE IF NOT EXISTS grid_users (
      grid_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (grid_id, user_id),
      FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_grid_users_user ON grid_users(user_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_grid_users_grid ON grid_users(grid_id)");

  // 2. Vérifier si l'ancienne colonne grids.user_id existe encore
  const columns = await all("PRAGMA table_info(grids)");
  const hasUserId = columns.some((c) => c.name === "user_id");

  if (hasUserId) {
    console.log("Backfilling grid_users from grids.user_id...");
    const backfilled = await run(`
      INSERT OR IGNORE INTO grid_users (grid_id, user_id, role, created_at)
      SELECT id, user_id, 'owner', created_at FROM grids WHERE user_id IS NOT NULL
    `);
    console.log(`Backfilled rows: ${backfilled}`);

    console.log("Rebuilding grids table without user_id and creator cascade...");
    await run("PRAGMA foreign_keys = OFF");
    await run("DROP TRIGGER IF EXISTS trg_delete_orphaned_grids");
    await run(`
      CREATE TABLE IF NOT EXISTS grids_new (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await run(
      "INSERT INTO grids_new (id, name, created_at) SELECT id, name, created_at FROM grids"
    );
    await run("DROP TABLE grids");
    await run("ALTER TABLE grids_new RENAME TO grids");

    await run(`
      CREATE TRIGGER IF NOT EXISTS trg_delete_orphaned_grids
      AFTER DELETE ON grid_users
      BEGIN
        DELETE FROM grids
        WHERE id = OLD.grid_id
          AND NOT EXISTS (SELECT 1 FROM grid_users WHERE grid_id = OLD.grid_id);
      END
    `);
    await run("PRAGMA foreign_keys = ON");

    const check = await all("PRAGMA foreign_key_check");
    if (check.length > 0) {
      throw new Error(`Foreign key check failed: ${JSON.stringify(check)}`);
    }
    console.log("grids table successfully migrated.");
  } else {
    console.log("grids table is already using modern schema (no user_id column).");
  }

  // 3. Assurer la création de la table field_locks et de ses index
  console.log("Ensuring field_locks table and indexes exist...");
  await run(`
    CREATE TABLE IF NOT EXISTS field_locks (
      grid_id    TEXT NOT NULL,
      lock_key   TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      user_name  TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      PRIMARY KEY (grid_id, lock_key),
      FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(
    "CREATE INDEX IF NOT EXISTS idx_field_locks_expiry ON field_locks(grid_id, expires_at)"
  );

  console.log("Migration complete.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
