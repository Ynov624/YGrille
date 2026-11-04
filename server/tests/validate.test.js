import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateLockKeysPayload,
  validateGridMemberPayload,
  validateGridMemberRolePayload,
  validateMarkPayload,
  validateRolePayload,
  validateGridPayload,
  validateStudentPayload,
  validatePromoPayload,
  validatePromoStudentPayload,
} from "../src/utils/validate.js";

describe("validateLockKeysPayload", () => {
  it("rejects non-array and empty payload with 400", () => {
    assert.throws(
      () => validateLockKeysPayload(null),
      (err) => err.status === 400 && err.message === "Clés de verrouillage manquantes."
    );
    assert.throws(
      () => validateLockKeysPayload(undefined),
      (err) => err.status === 400 && err.message === "Clés de verrouillage manquantes."
    );
    assert.throws(
      () => validateLockKeysPayload([]),
      (err) => err.status === 400 && err.message === "Clés de verrouillage manquantes."
    );
    assert.throws(
      () => validateLockKeysPayload("single-key"),
      (err) => err.status === 400 && err.message === "Clés de verrouillage manquantes."
    );
  });

  it("rejects payload exceeding 50 keys with 400", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `key-${i}`);
    assert.throws(
      () => validateLockKeysPayload(tooMany),
      (err) => err.status === 400 && err.message === "Trop de clés demandées (maximum 50)."
    );
  });

  it("trims whitespace and strips invalid entries", () => {
    const raw = ["  eval:student:1:crit:1  ", "", "   ", 123, null, "  eval:student:1:general  "];
    const clean = validateLockKeysPayload(raw);
    assert.deepEqual(clean, ["eval:student:1:crit:1", "eval:student:1:general"]);
  });

  it("strips keys exceeding 128 characters", () => {
    const longKey = "a".repeat(129);
    const validKey = "a".repeat(128);
    const clean = validateLockKeysPayload([longKey, validKey]);
    assert.deepEqual(clean, [validKey]);
  });

  it("rejects payload when no valid keys remain with 400", () => {
    assert.throws(
      () => validateLockKeysPayload(["", "   ", "a".repeat(130), 42]),
      (err) => err.status === 400 && err.message === "Clés de verrouillage invalides."
    );
  });
});

describe("validateGridMemberPayload", () => {
  it("validates and normalizes valid member payload", () => {
    const res = validateGridMemberPayload({ email: "  PROF.DUPONT@ynov.com  ", role: "owner" });
    assert.deepEqual(res, { email: "prof.dupont@ynov.com", role: "owner" });
  });

  it("defaults role to editor when role is omitted", () => {
    const res = validateGridMemberPayload({ email: "prof.martin@ynov.com" });
    assert.deepEqual(res, { email: "prof.martin@ynov.com", role: "editor" });
  });

  it("rejects non-ynov and malformed emails with 400", () => {
    assert.throws(
      () => validateGridMemberPayload({ email: "teacher@gmail.com" }),
      (err) =>
        err.status === 400 && err.details.includes("Seules les adresses @ynov.com sont autorisées.")
    );
    assert.throws(
      () => validateGridMemberPayload({ email: "invalid-email" }),
      (err) => err.status === 400 && err.details.includes("Adresse e-mail invalide.")
    );
  });

  it("rejects unknown role with 400", () => {
    assert.throws(
      () => validateGridMemberPayload({ email: "user@ynov.com", role: "admin" }),
      (err) =>
        err.status === 400 && err.details.includes("Le rôle doit être « owner » ou « editor ».")
    );
  });
});

describe("validateGridMemberRolePayload", () => {
  it("accepts owner and editor roles", () => {
    assert.deepEqual(validateGridMemberRolePayload({ role: "owner" }), { role: "owner" });
    assert.deepEqual(validateGridMemberRolePayload({ role: "editor" }), { role: "editor" });
  });

  it("rejects invalid roles with 400", () => {
    assert.throws(
      () => validateGridMemberRolePayload({ role: "viewer" }),
      (err) => err.status === 400
    );
    assert.throws(
      () => validateGridMemberRolePayload({}),
      (err) => err.status === 400
    );
  });
});

describe("validateMarkPayload", () => {
  it("accepts valid levelPosition and comment", () => {
    const res = validateMarkPayload({ levelPosition: 2, comment: "  Bien  " });
    assert.deepEqual(res, { levelPosition: 2, comment: "Bien" });
  });

  it("accepts levelPosition null (deselection)", () => {
    const res = validateMarkPayload({ levelPosition: null });
    assert.deepEqual(res, { levelPosition: null });
  });

  it("rejects out of bounds and non-integer levelPosition with 400", () => {
    assert.throws(
      () => validateMarkPayload({ levelPosition: -1 }),
      (err) => err.status === 400
    );
    assert.throws(
      () => validateMarkPayload({ levelPosition: 5 }),
      (err) => err.status === 400
    );
    assert.throws(
      () => validateMarkPayload({ levelPosition: 2.5 }),
      (err) => err.status === 400
    );
  });

  it("rejects payload with neither levelPosition nor comment", () => {
    assert.throws(
      () => validateMarkPayload({}),
      (err) => err.status === 400 && err.details.includes("Aucune valeur à enregistrer.")
    );
  });
});

describe("validateRolePayload", () => {
  it("accepts user and admin roles", () => {
    assert.deepEqual(validateRolePayload({ role: "user" }), { role: "user" });
    assert.deepEqual(validateRolePayload({ role: "admin" }), { role: "admin" });
  });

  it("rejects invalid role with 400", () => {
    assert.throws(
      () => validateRolePayload({ role: "owner" }),
      (err) => err.status === 400
    );
  });
});

describe("validateGridPayload", () => {
  const validLevels = [
    { label: "L1", pct: 0 },
    { label: "L2", pct: 25 },
    { label: "L3", pct: 50 },
    { label: "L4", pct: 75 },
    { label: "L5", pct: 100 },
  ];

  it("validates and normalizes valid grid definition", () => {
    const raw = {
      name: "  Rubric A  ",
      levels: validLevels,
      categories: [{ name: "  Cat 1  ", deliverable: " Code " }],
      criteria: [{ name: "  Crit 1  ", weight: 20, categoryIndex: 0 }],
    };
    const clean = validateGridPayload(raw);
    assert.equal(clean.name, "Rubric A");
    assert.equal(clean.levels.length, 5);
    assert.equal(clean.categories[0].name, "Cat 1");
    assert.equal(clean.categories[0].deliverable, "Code");
    assert.equal(clean.criteria[0].name, "Crit 1");
    assert.equal(clean.criteria[0].weight, 20);
  });

  it("rejects missing grid name with 400", () => {
    assert.throws(
      () =>
        validateGridPayload({
          name: "  ",
          levels: validLevels,
          categories: [{ name: "Cat 1" }],
          criteria: [{ name: "Crit 1", weight: 20, categoryIndex: 0 }],
        }),
      (err) => err.status === 400 && err.details.includes("Le nom de la grille est obligatoire.")
    );
  });

  it("rejects level count different from 5 with 400", () => {
    assert.throws(
      () =>
        validateGridPayload({
          name: "Rubric",
          levels: validLevels.slice(0, 4),
          categories: [{ name: "Cat 1" }],
          criteria: [{ name: "Crit 1", weight: 20, categoryIndex: 0 }],
        }),
      (err) =>
        err.status === 400 &&
        err.details.includes("La grille doit comporter exactement 5 niveaux d'acquisition.")
    );
  });

  it("rejects missing categories with 400", () => {
    assert.throws(
      () =>
        validateGridPayload({
          name: "Rubric",
          levels: validLevels,
          categories: [],
          criteria: [{ name: "Crit 1", weight: 20, categoryIndex: 0 }],
        }),
      (err) => err.status === 400 && err.details.includes("Ajoutez au moins une catégorie.")
    );
  });

  it("rejects missing criteria or zero total weight with 400", () => {
    assert.throws(
      () =>
        validateGridPayload({
          name: "Rubric",
          levels: validLevels,
          categories: [{ name: "Cat 1" }],
          criteria: [],
        }),
      (err) => err.status === 400 && err.details.includes("Ajoutez au moins un critère.")
    );
    assert.throws(
      () =>
        validateGridPayload({
          name: "Rubric",
          levels: validLevels,
          categories: [{ name: "Cat 1" }],
          criteria: [{ name: "Crit 1", weight: 0, categoryIndex: 0 }],
        }),
      (err) =>
        err.status === 400 &&
        err.details.includes("La somme des points des critères doit être supérieure à 0.")
    );
  });

  it("rejects criteria with invalid categoryIndex with 400", () => {
    assert.throws(
      () =>
        validateGridPayload({
          name: "Rubric",
          levels: validLevels,
          categories: [{ name: "Cat 1" }],
          criteria: [{ name: "Crit 1", weight: 10, categoryIndex: 99 }],
        }),
      (err) =>
        err.status === 400 &&
        err.details.includes("Le critère 1 doit être rattaché à une catégorie.")
    );
  });
});

describe("validateStudentPayload", () => {
  it("validates and normalizes valid student payload", () => {
    const res = validateStudentPayload({
      lastName: "  Dupont  ",
      firstName: "  Jean  ",
      comment: "  Projet bien mené  ",
    });
    assert.deepEqual(res, { lastName: "Dupont", firstName: "Jean", comment: "Projet bien mené" });
  });

  it("rejects missing lastName with 400", () => {
    assert.throws(
      () => validateStudentPayload({ lastName: "  ", firstName: "Jean" }),
      (err) => err.status === 400 && err.details.includes("Le nom de l'élève est obligatoire.")
    );
  });
});

describe("validatePromoPayload", () => {
  it("validates valid promo name", () => {
    assert.deepEqual(validatePromoPayload({ name: "  B3 Informatique  " }), {
      name: "B3 Informatique",
    });
  });

  it("rejects missing or empty promo name with 400", () => {
    assert.throws(
      () => validatePromoPayload({ name: "   " }),
      (err) => err.status === 400 && err.details.includes("Le nom de la promo est obligatoire.")
    );
  });
});

describe("validatePromoStudentPayload", () => {
  it("validates valid promo student payload", () => {
    const res = validatePromoStudentPayload({ lastName: "  Curie  ", firstName: "  Marie  " });
    assert.deepEqual(res, { lastName: "Curie", firstName: "Marie" });
  });

  it("rejects missing lastName with 400", () => {
    assert.throws(
      () => validatePromoStudentPayload({ lastName: "" }),
      (err) => err.status === 400 && err.details.includes("Le nom de l'élève est obligatoire.")
    );
  });
});
