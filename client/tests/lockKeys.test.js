import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCriterionLockKeys,
  getGeneralCommentLockKeys,
  getStoredGeneralComment,
  findConflict,
} from "../src/features/grids/lockKeys.js";

describe("getCriterionLockKeys", () => {
  it("returns student criterion key in individual mode", () => {
    const keys = getCriterionLockKeys("individuel", { id: "s-1" }, "crit-10");
    assert.deepEqual(keys, ["eval:student:s-1:crit:crit-10"]);
  });

  it("returns empty array in individual mode when student has no id", () => {
    assert.deepEqual(getCriterionLockKeys("individuel", null, "crit-10"), []);
    assert.deepEqual(getCriterionLockKeys("individuel", {}, "crit-10"), []);
  });

  it("returns all member criterion keys in group mode", () => {
    const members = [{ id: "s-1" }, { id: "s-2" }, { id: "s-3" }];
    const keys = getCriterionLockKeys("groupe", null, "crit-10", members);
    assert.deepEqual(keys, [
      "eval:student:s-1:crit:crit-10",
      "eval:student:s-2:crit:crit-10",
      "eval:student:s-3:crit:crit-10",
    ]);
  });

  it("returns empty array in group mode when members list is empty", () => {
    assert.deepEqual(getCriterionLockKeys("groupe", null, "crit-10", []), []);
  });
});

describe("getGeneralCommentLockKeys", () => {
  it("returns student general key in individual mode", () => {
    const keys = getGeneralCommentLockKeys("individuel", { id: "s-1" });
    assert.deepEqual(keys, ["eval:student:s-1:general"]);
  });

  it("returns empty array in individual mode when student has no id", () => {
    assert.deepEqual(getGeneralCommentLockKeys("individuel", null), []);
    assert.deepEqual(getGeneralCommentLockKeys("individuel", {}), []);
  });

  it("returns all member general keys in group mode", () => {
    const members = [{ id: "s-1" }, { id: "s-2" }];
    const keys = getGeneralCommentLockKeys("groupe", null, members);
    assert.deepEqual(keys, ["eval:student:s-1:general", "eval:student:s-2:general"]);
  });

  it("returns empty array in group mode when members list is empty", () => {
    assert.deepEqual(getGeneralCommentLockKeys("groupe", null, []), []);
  });
});

describe("getStoredGeneralComment", () => {
  it("returns student comment in individual mode", () => {
    assert.equal(
      getStoredGeneralComment("individuel", { comment: "Très bon travail" }),
      "Très bon travail"
    );
    assert.equal(getStoredGeneralComment("individuel", { comment: null }), "");
    assert.equal(getStoredGeneralComment("individuel", null), "");
  });

  it("returns empty string in group mode when members list is empty", () => {
    assert.equal(getStoredGeneralComment("groupe", null, []), "");
  });

  it("returns common comment when all group members have identical text", () => {
    const members = [
      { id: "s-1", comment: "Projet complet" },
      { id: "s-2", comment: "Projet complet" },
    ];
    assert.equal(getStoredGeneralComment("groupe", null, members), "Projet complet");
  });

  it("returns empty string when group members have divergent comments", () => {
    const members = [
      { id: "s-1", comment: "Projet complet" },
      { id: "s-2", comment: "Manque la démo" },
    ];
    assert.equal(getStoredGeneralComment("groupe", null, members), "");
  });

  it("normalizes null and undefined comments in group mode", () => {
    const members = [
      { id: "s-1", comment: null },
      { id: "s-2", comment: "" },
    ];
    assert.equal(getStoredGeneralComment("groupe", null, members), "");
  });
});

describe("findConflict", () => {
  it("returns null when activeLocks is null, undefined, or empty", () => {
    assert.equal(findConflict(["k1"], null, "u-1"), null);
    assert.equal(findConflict(["k1"], undefined, "u-1"), null);
    assert.equal(findConflict(["k1"], {}, "u-1"), null);
  });

  it("returns structure lock when held by a collaborator", () => {
    const activeLocks = {
      "grid:structure": { userId: "u-2", user_name: "Collaborateur" },
    };
    const conflict = findConflict(["eval:student:s-1:crit:c-1"], activeLocks, "u-1");
    assert.deepEqual(conflict, activeLocks["grid:structure"]);
  });

  it("ignores structure lock when held by current user", () => {
    const activeLocks = {
      "grid:structure": { userId: "u-1", user_name: "Moi" },
    };
    const conflict = findConflict(["eval:student:s-1:crit:c-1"], activeLocks, "u-1");
    assert.equal(conflict, null);
  });

  it("returns target key lock when held by a collaborator", () => {
    const activeLocks = {
      "eval:student:s-2:crit:c-1": { user_id: "u-2", user_name: "Collaborateur" },
    };
    const keys = ["eval:student:s-1:crit:c-1", "eval:student:s-2:crit:c-1"];
    const conflict = findConflict(keys, activeLocks, "u-1");
    assert.deepEqual(conflict, activeLocks["eval:student:s-2:crit:c-1"]);
  });

  it("supports single key string argument", () => {
    const activeLocks = {
      "eval:student:s-1:crit:c-1": { user_id: "u-2", user_name: "Collaborateur" },
    };
    const conflict = findConflict("eval:student:s-1:crit:c-1", activeLocks, "u-1");
    assert.deepEqual(conflict, activeLocks["eval:student:s-1:crit:c-1"]);
  });

  it("ignores target key lock when held by current user", () => {
    const activeLocks = {
      "eval:student:s-1:crit:c-1": { user_id: "u-1", user_name: "Moi" },
    };
    const conflict = findConflict(["eval:student:s-1:crit:c-1"], activeLocks, "u-1");
    assert.equal(conflict, null);
  });
});
