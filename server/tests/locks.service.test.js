import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setupTestDatabase } from "./setup.js";
import {
  listActiveLocks,
  acquireOrRenewLocks,
  releaseLocks,
  assertLockPermitted,
} from "../src/services/locks.service.js";
import { all, run } from "../src/db/connection.js";

describe("locks.service", () => {
  let db;

  beforeEach(async () => {
    db = await setupTestDatabase();
    await db.seedUsersAndGrid();
  });

  describe("listActiveLocks", () => {
    it("rejects non-members with 404", async () => {
      await assert.rejects(
        () => listActiveLocks("grid-1", "u-other"),
        (err) => err.status === 404
      );
    });

    it("returns active unexpired locks for grid members", async () => {
      const now = Date.now();
      await run(
        "INSERT INTO field_locks (grid_id, lock_key, user_id, user_name, expires_at) VALUES (?, ?, ?, ?, ?)",
        ["grid-1", "k1", "u-owner", "Owner User", now + 60000]
      );

      const locks = await listActiveLocks("grid-1", "u-editor");
      assert.equal(locks.length, 1);
      assert.equal(locks[0].lock_key, "k1");
      assert.equal(locks[0].user_id, "u-owner");
    });

    it("filters out expired locks without executing DELETE (read-only polling)", async () => {
      const now = Date.now();
      await run(
        "INSERT INTO field_locks (grid_id, lock_key, user_id, user_name, expires_at) VALUES (?, ?, ?, ?, ?)",
        ["grid-1", "expired-key", "u-owner", "Owner User", now - 1000]
      );

      const active = await listActiveLocks("grid-1", "u-owner");
      assert.equal(active.length, 0);

      // Verify the expired record remains in the database
      const rows = await all("SELECT * FROM field_locks WHERE lock_key = ?", ["expired-key"]);
      assert.equal(rows.length, 1);
    });
  });

  describe("acquireOrRenewLocks", () => {
    it("returns acquired true with 0 expiresAt for empty keys", async () => {
      const res = await acquireOrRenewLocks("grid-1", [], "u-owner", "Owner User");
      assert.deepEqual(res, { acquired: true, expiresAt: 0 });
    });

    it("allows owner to lock grid:structure", async () => {
      const res = await acquireOrRenewLocks("grid-1", ["grid:structure"], "u-owner", "Owner User");
      assert.equal(res.acquired, true);
      assert.ok(res.expiresAt > Date.now());
    });

    it("rejects editor attempting to lock grid:structure with 403", async () => {
      await assert.rejects(
        () => acquireOrRenewLocks("grid-1", ["grid:structure"], "u-editor", "Editor User"),
        (err) =>
          err.status === 403 && err.message === "Action réservée au propriétaire de la grille."
      );
    });

    it("acquires and renews keys for the same user", async () => {
      const first = await acquireOrRenewLocks("grid-1", ["k1", "k2"], "u-owner", "Owner User", 30);
      assert.equal(first.acquired, true);

      const renewed = await acquireOrRenewLocks(
        "grid-1",
        ["k1", "k2"],
        "u-owner",
        "Owner User",
        60
      );
      assert.equal(renewed.acquired, true);
      assert.ok(renewed.expiresAt >= first.expiresAt);
    });

    it("detects conflict when keys are locked by another collaborator", async () => {
      await acquireOrRenewLocks("grid-1", ["k1"], "u-owner", "Owner User", 60);

      const attempt = await acquireOrRenewLocks(
        "grid-1",
        ["k1", "k2"],
        "u-editor",
        "Editor User",
        60
      );
      assert.equal(attempt.acquired, false);
      assert.equal(attempt.lockedBy, "Owner User");
      assert.ok(attempt.expiresAt > Date.now());
    });

    it("preserves pre-existing locks when batch acquisition fails (non-destructive rollback)", async () => {
      // u-owner holds k1 with expiry T1
      const initial = await acquireOrRenewLocks("grid-1", ["k1"], "u-owner", "Owner User", 60);
      assert.equal(initial.acquired, true);

      // u-editor holds k2
      await acquireOrRenewLocks("grid-1", ["k2"], "u-editor", "Editor User", 60);

      // u-owner attempts to renew k1 while acquiring k2 (which collides with u-editor)
      const collision = await acquireOrRenewLocks(
        "grid-1",
        ["k1", "k2"],
        "u-owner",
        "Owner User",
        90
      );
      assert.equal(collision.acquired, false);

      // Verify u-owner STILL owns k1
      const check = await all(
        "SELECT user_id, expires_at FROM field_locks WHERE grid_id = ? AND lock_key = ?",
        ["grid-1", "k1"]
      );
      assert.equal(check.length, 1);
      assert.equal(check[0].user_id, "u-owner");
    });

    it("purges expired locks opportunistically on write", async () => {
      const now = Date.now();
      await run(
        "INSERT INTO field_locks (grid_id, lock_key, user_id, user_name, expires_at) VALUES (?, ?, ?, ?, ?)",
        ["grid-1", "stale-key", "u-owner", "Owner User", now - 5000]
      );

      await acquireOrRenewLocks("grid-1", ["new-key"], "u-editor", "Editor User", 60);

      const stale = await all("SELECT * FROM field_locks WHERE lock_key = ?", ["stale-key"]);
      assert.equal(stale.length, 0);
    });
  });

  describe("releaseLocks", () => {
    it("deletes caller locks", async () => {
      await acquireOrRenewLocks("grid-1", ["k1", "k2"], "u-owner", "Owner User", 60);
      await releaseLocks("grid-1", ["k1"], "u-owner");

      const remaining = await all("SELECT lock_key FROM field_locks WHERE grid_id = ?", ["grid-1"]);
      assert.deepEqual(
        remaining.map((r) => r.lock_key),
        ["k2"]
      );
    });

    it("does not delete locks held by other users", async () => {
      await acquireOrRenewLocks("grid-1", ["k1"], "u-owner", "Owner User", 60);
      await releaseLocks("grid-1", ["k1"], "u-editor");

      const remaining = await all("SELECT lock_key, user_id FROM field_locks WHERE grid_id = ?", [
        "grid-1",
      ]);
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].user_id, "u-owner");
    });

    it("ignores empty keys", async () => {
      await acquireOrRenewLocks("grid-1", ["k1"], "u-owner", "Owner User", 60);

      await assert.doesNotReject(() => releaseLocks("grid-1", [], "u-owner"));
      await assert.doesNotReject(() => releaseLocks("grid-1", null, "u-owner"));

      const remaining = await all("SELECT lock_key FROM field_locks WHERE grid_id = ?", ["grid-1"]);
      assert.equal(remaining.length, 1);
    });
  });

  describe("assertLockPermitted", () => {
    it("passes for unreserved keys", async () => {
      await assert.doesNotReject(() => assertLockPermitted("grid-1", ["free-key"], "u-owner"));
    });

    it("passes when caller holds the lock", async () => {
      await acquireOrRenewLocks("grid-1", ["my-key"], "u-owner", "Owner User", 60);
      await assert.doesNotReject(() => assertLockPermitted("grid-1", ["my-key"], "u-owner"));
    });

    it("throws 423 Locked when target key is locked by another user", async () => {
      await acquireOrRenewLocks("grid-1", ["eval:student:1:crit:1"], "u-owner", "Owner User", 60);

      await assert.rejects(
        () => assertLockPermitted("grid-1", ["eval:student:1:crit:1"], "u-editor"),
        (err) =>
          err.status === 423 &&
          err.message === "Ce champ est actuellement verrouillé par Owner User."
      );
    });

    it("throws 423 Locked on evaluation write when grid:structure is locked by another user", async () => {
      await acquireOrRenewLocks("grid-1", ["grid:structure"], "u-owner", "Owner User", 60);

      await assert.rejects(
        () => assertLockPermitted("grid-1", ["eval:student:1:crit:1"], "u-editor"),
        (err) =>
          err.status === 423 &&
          err.message === "La structure du barème est en cours de modification par Owner User."
      );
    });

    it("passes when caller is the owner holding grid:structure", async () => {
      await acquireOrRenewLocks("grid-1", ["grid:structure"], "u-owner", "Owner User", 60);
      await assert.doesNotReject(() =>
        assertLockPermitted("grid-1", ["eval:student:1:crit:1"], "u-owner")
      );
    });
  });
});
