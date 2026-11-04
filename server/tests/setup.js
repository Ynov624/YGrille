import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { batch, executeMultiple, resetDbClient } from "../src/db/connection.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function setupTestDatabase() {
  process.env.NODE_ENV = "test";
  process.env.SQLITE_DB_PATH = "file::memory:";

  resetDbClient();

  const schema = readFileSync(join(here, "..", "src", "db", "schema.sql"), "utf-8");
  await executeMultiple(schema);

  return {
    async seedUsersAndGrid() {
      await batch([
        {
          sql: "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
          args: ["u-owner", "owner@ynov.com", "hash", "Owner User", "user"],
        },
        {
          sql: "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
          args: ["u-owner2", "owner2@ynov.com", "hash", "Owner Two", "user"],
        },
        {
          sql: "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
          args: ["u-editor", "editor@ynov.com", "hash", "Editor User", "user"],
        },
        {
          sql: "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
          args: ["u-other", "other@ynov.com", "hash", "Other User", "user"],
        },
        {
          sql: "INSERT INTO grids (id, name) VALUES (?, ?)",
          args: ["grid-1", "Test Grid"],
        },
        {
          sql: "INSERT INTO grid_users (grid_id, user_id, role) VALUES (?, ?, 'owner')",
          args: ["grid-1", "u-owner"],
        },
        {
          sql: "INSERT INTO grid_users (grid_id, user_id, role) VALUES (?, ?, 'editor')",
          args: ["grid-1", "u-editor"],
        },
      ]);
    },
  };
}
