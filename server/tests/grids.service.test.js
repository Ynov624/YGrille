import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { setupTestDatabase } from "./setup.js";
import {
  assertGridAccess,
  listGridMembers,
  addGridMember,
  updateGridMemberRole,
  removeGridMember,
  leaveGrid,
  updateGrid,
  deleteGrid,
} from "../src/services/grids.service.js";
import { all, get, run } from "../src/db/connection.js";

describe("grids.service (sharing & authorization)", () => {
  let db;

  beforeEach(async () => {
    db = await setupTestDatabase();
    await db.seedUsersAndGrid();
  });

  describe("assertGridAccess", () => {
    it("returns role for authorized grid member", async () => {
      const ownerRole = await assertGridAccess("grid-1", "u-owner");
      assert.equal(ownerRole, "owner");

      const editorRole = await assertGridAccess("grid-1", "u-editor");
      assert.equal(editorRole, "editor");
    });

    it("throws 404 for non-members", async () => {
      await assert.rejects(
        () => assertGridAccess("grid-1", "u-other"),
        (err) => err.status === 404 && err.message === "Grille introuvable."
      );
    });

    it("throws 403 when user does not have the required role", async () => {
      await assert.rejects(
        () => assertGridAccess("grid-1", "u-editor", "owner"),
        (err) =>
          err.status === 403 && err.message === "Action réservée au propriétaire de la grille."
      );
    });

    it("passes when user has the required role", async () => {
      const role = await assertGridAccess("grid-1", "u-owner", "owner");
      assert.equal(role, "owner");
    });
  });

  describe("listGridMembers", () => {
    it("returns members list ordered with owners first", async () => {
      const members = await listGridMembers("grid-1", "u-editor");
      assert.equal(members.length, 2);
      assert.equal(members[0].id, "u-owner");
      assert.equal(members[0].role, "owner");
      assert.equal(members[1].id, "u-editor");
      assert.equal(members[1].role, "editor");
    });

    it("rejects non-members with 404", async () => {
      await assert.rejects(
        () => listGridMembers("grid-1", "u-other"),
        (err) => err.status === 404
      );
    });
  });

  describe("addGridMember", () => {
    it("rejects non-owners with 403", async () => {
      await assert.rejects(
        () => addGridMember("grid-1", "u-editor", { email: "other@ynov.com", role: "editor" }),
        (err) => err.status === 403
      );
    });

    it("rejects non-existent user email with 400", async () => {
      await assert.rejects(
        () => addGridMember("grid-1", "u-owner", { email: "nonexistent@ynov.com", role: "editor" }),
        (err) => err.status === 400 && err.message.includes("Impossible d'ajouter cet utilisateur")
      );
    });

    it("rejects adding an already existing member with 400", async () => {
      await assert.rejects(
        () => addGridMember("grid-1", "u-owner", { email: "editor@ynov.com", role: "editor" }),
        (err) =>
          err.status === 400 && err.message === "Cet utilisateur est déjà membre de cette grille."
      );
    });

    it("adds member successfully when caller is owner", async () => {
      const updated = await addGridMember("grid-1", "u-owner", {
        email: "other@ynov.com",
        role: "editor",
      });
      assert.equal(updated.length, 3);
      assert.ok(updated.some((m) => m.id === "u-other" && m.role === "editor"));
    });
  });

  describe("updateGridMemberRole", () => {
    it("rejects non-owners with 403", async () => {
      await assert.rejects(
        () => updateGridMemberRole("grid-1", "u-editor", "u-editor", { role: "owner" }),
        (err) => err.status === 403
      );
    });

    it("rejects member not in grid with 404", async () => {
      await assert.rejects(
        () => updateGridMemberRole("grid-1", "u-owner", "u-other", { role: "editor" }),
        (err) => err.status === 404
      );
    });

    it("sole owner protection: rejects demoting the only owner with 400", async () => {
      await assert.rejects(
        () => updateGridMemberRole("grid-1", "u-owner", "u-owner", { role: "editor" }),
        (err) =>
          err.status === 400 &&
          err.message ===
            "Impossible de rétrograder le seul propriétaire de la grille. Désignez un autre propriétaire au préalable."
      );
    });

    it("promotes editor to owner and allows demoting owner when another owner exists", async () => {
      // Promote u-editor to owner
      await updateGridMemberRole("grid-1", "u-owner", "u-editor", { role: "owner" });

      const members = await listGridMembers("grid-1", "u-owner");
      assert.equal(members.find((m) => m.id === "u-editor").role, "owner");

      // Now u-owner can be demoted since u-editor is also an owner
      await updateGridMemberRole("grid-1", "u-editor", "u-owner", { role: "editor" });

      const updated = await listGridMembers("grid-1", "u-editor");
      assert.equal(updated.find((m) => m.id === "u-owner").role, "editor");
      assert.equal(updated.find((m) => m.id === "u-editor").role, "owner");
    });
  });

  describe("removeGridMember", () => {
    it("rejects non-owners with 403 when removing another user", async () => {
      await assert.rejects(
        () => removeGridMember("grid-1", "u-editor", "u-owner"),
        (err) => err.status === 403
      );
    });

    it("rejects non-member target with 404", async () => {
      await assert.rejects(
        () => removeGridMember("grid-1", "u-owner", "u-other"),
        (err) => err.status === 404
      );
    });

    it("sole owner protection: rejects removing the only owner with 400", async () => {
      await assert.rejects(
        () => removeGridMember("grid-1", "u-owner", "u-owner"),
        (err) => err.status === 400 && err.message.includes("seul propriétaire")
      );
    });

    it("removes an editor when requested by owner", async () => {
      await removeGridMember("grid-1", "u-owner", "u-editor");
      const remaining = await all("SELECT user_id FROM grid_users WHERE grid_id = ?", ["grid-1"]);
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].user_id, "u-owner");
    });
  });

  describe("leaveGrid", () => {
    it("sole owner protection: rejects sole owner leaving with 400", async () => {
      await assert.rejects(
        () => leaveGrid("grid-1", "u-owner"),
        (err) =>
          err.status === 400 && err.message.includes("Vous êtes le seul propriétaire de la grille.")
      );
    });

    it("allows editor to leave shared grid", async () => {
      await leaveGrid("grid-1", "u-editor");
      const check = await get("SELECT * FROM grid_users WHERE grid_id = ? AND user_id = ?", [
        "grid-1",
        "u-editor",
      ]);
      assert.equal(check, undefined);
    });

    it("allows owner to leave when multiple owners exist", async () => {
      // Add second owner
      await run("INSERT INTO grid_users (grid_id, user_id, role) VALUES (?, ?, 'owner')", [
        "grid-1",
        "u-owner2",
      ]);

      // First owner leaves
      await leaveGrid("grid-1", "u-owner");
      const check = await get("SELECT * FROM grid_users WHERE grid_id = ? AND user_id = ?", [
        "grid-1",
        "u-owner",
      ]);
      assert.equal(check, undefined);

      // Second owner remains
      const remaining = await get("SELECT * FROM grid_users WHERE grid_id = ? AND user_id = ?", [
        "grid-1",
        "u-owner2",
      ]);
      assert.equal(remaining.role, "owner");
    });

    it("deletes orphaned grid via trigger when last member leaves", async () => {
      // Grid with single member u-editor
      await run("INSERT INTO grids (id, name) VALUES ('grid-temp', 'Temp Grid')");
      await run(
        "INSERT INTO grid_users (grid_id, user_id, role) VALUES ('grid-temp', 'u-editor', 'editor')"
      );

      await leaveGrid("grid-temp", "u-editor");

      // Verify grid-temp was automatically deleted from grids table by trigger
      const grid = await get("SELECT * FROM grids WHERE id = 'grid-temp'");
      assert.equal(grid, undefined);
    });
  });

  describe("editor restrictions on grid structure", () => {
    it("rejects editor updating grid rubric with 403", async () => {
      await assert.rejects(
        () =>
          updateGrid("grid-1", "u-editor", {
            name: "Hacked Name",
            levels: [],
            categories: [],
            criteria: [],
          }),
        (err) => err.status === 403
      );
    });

    it("rejects editor deleting grid with 403", async () => {
      await assert.rejects(
        () => deleteGrid("grid-1", "u-editor"),
        (err) => err.status === 403
      );
    });

    it("allows owner to delete grid", async () => {
      await deleteGrid("grid-1", "u-owner");
      const check = await get("SELECT * FROM grids WHERE id = 'grid-1'");
      assert.equal(check, undefined);
    });
  });
});
