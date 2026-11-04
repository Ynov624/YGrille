import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { executeMultiple, resetDbClient, all, run, get } from "../src/db/connection.js";
import { migrate } from "../src/db/migrate.js";

describe("db:migrate", () => {
  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.SQLITE_DB_PATH = "file::memory:";
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;
    resetDbClient();
  });

  it("migrates legacy schema with grids.user_id to grid_users junction table", async () => {
    // 1. Setup legacy schema
    await executeMultiple(`
      CREATE TABLE users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL DEFAULT '',
        role          TEXT NOT NULL DEFAULT 'user'
      );

      CREATE TABLE grids (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL,
        name       TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE levels (
        id       TEXT PRIMARY KEY,
        grid_id  TEXT NOT NULL,
        position INTEGER NOT NULL,
        label    TEXT NOT NULL,
        pct      INTEGER NOT NULL,
        FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
      );
    `);

    // 2. Insert test fixtures into legacy tables
    await run(
      "INSERT INTO users (id, email, password_hash, name) VALUES ('u-1', 'u1@ynov.com', 'h1', 'User 1')"
    );
    await run(
      "INSERT INTO users (id, email, password_hash, name) VALUES ('u-2', 'u2@ynov.com', 'h2', 'User 2')"
    );
    await run("INSERT INTO grids (id, user_id, name) VALUES ('g-1', 'u-1', 'Legacy Grid 1')");
    await run("INSERT INTO grids (id, user_id, name) VALUES ('g-2', 'u-2', 'Legacy Grid 2')");
    await run(
      "INSERT INTO levels (id, grid_id, position, label, pct) VALUES ('lvl-1', 'g-1', 0, 'Acquis', 100)"
    );

    // 3. Execute migration
    await migrate();

    // 4. Verify grid_users is backfilled with 'owner'
    const memberships = await all("SELECT grid_id, user_id, role FROM grid_users ORDER BY grid_id");
    assert.deepEqual(memberships, [
      { grid_id: "g-1", user_id: "u-1", role: "owner" },
      { grid_id: "g-2", user_id: "u-2", role: "owner" },
    ]);

    // 5. Verify grids table dropped user_id column
    const gridCols = await all("PRAGMA table_info(grids)");
    assert.equal(
      gridCols.some((c) => c.name === "user_id"),
      false
    );
    assert.equal(
      gridCols.some((c) => c.name === "id"),
      true
    );
    assert.equal(
      gridCols.some((c) => c.name === "name"),
      true
    );

    // 6. Verify cascade relations remain intact (levels child row preserved)
    const level = await get("SELECT * FROM levels WHERE id = 'lvl-1'");
    assert.ok(level);
    assert.equal(level.grid_id, "g-1");

    // 7. Verify field_locks table exists
    const lockTable = await all("PRAGMA table_info(field_locks)");
    assert.ok(lockTable.length > 0);

    // 8. Verify foreign key integrity
    const fkErrors = await all("PRAGMA foreign_key_check");
    assert.deepEqual(fkErrors, []);

    // 9. Verify orphan deletion trigger works
    await run("DELETE FROM grid_users WHERE grid_id = 'g-2'");
    const orphanedGrid = await get("SELECT * FROM grids WHERE id = 'g-2'");
    assert.equal(orphanedGrid, undefined);
  });

  it("is idempotent when executed on an already-migrated database", async () => {
    // 1. Setup modern schema
    await executeMultiple(`
      CREATE TABLE users (
        id    TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE
      );

      CREATE TABLE grids (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE grid_users (
        grid_id    TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        role       TEXT NOT NULL DEFAULT 'owner',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (grid_id, user_id)
      );
    `);

    // 2. Execute migration twice
    await migrate();
    await migrate();

    const cols = await all("PRAGMA table_info(grids)");
    assert.equal(
      cols.some((c) => c.name === "user_id"),
      false
    );
  });
});
