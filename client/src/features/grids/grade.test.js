import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  criterionPoints,
  formatPoints,
  computeCategoryGrades,
  computeGrade,
  formatGrade,
  suggestAppreciation,
} from "./grade.js";

const sampleLevels = [
  { position: 0, label: "Non acquis", pct: 0 },
  { position: 1, label: "En cours", pct: 25 },
  { position: 2, label: "Acquis", pct: 50 },
  { position: 3, label: "Maîtrisé", pct: 75 },
  { position: 4, label: "Expert", pct: 100 },
];

const sampleGrid = {
  id: "grid-1",
  name: "Test Rubric",
  levels: sampleLevels,
  categories: [
    { id: "cat-1", name: "Technique", deliverable: "Code" },
    { id: "cat-2", name: "Soutenance", deliverable: "Slides" },
  ],
  criteria: [
    { id: "crit-1", category_id: "cat-1", name: "Architecture", weight: 10 },
    { id: "crit-2", category_id: "cat-1", name: "Tests", weight: 5 },
    { id: "crit-3", category_id: "cat-2", name: "Présentation", weight: 5 },
  ],
};

describe("criterionPoints", () => {
  it("returns null if levelPosition is null or undefined", () => {
    assert.equal(criterionPoints({ weight: 10 }, null, sampleLevels), null);
    assert.equal(criterionPoints({ weight: 10 }, undefined, sampleLevels), null);
  });

  it("calculates points proportional to percentage", () => {
    assert.equal(criterionPoints({ weight: 10 }, 0, sampleLevels), 0);
    assert.equal(criterionPoints({ weight: 10 }, 2, sampleLevels), 5); // 50% of 10
    assert.equal(criterionPoints({ weight: 10 }, 4, sampleLevels), 10); // 100% of 10
    assert.equal(criterionPoints({ weight: 5 }, 1, sampleLevels), 1.25); // 25% of 5
  });

  it("handles non-existent level gracefully", () => {
    assert.equal(criterionPoints({ weight: 10 }, 99, sampleLevels), 0);
  });
});

describe("formatPoints", () => {
  it("formats null or undefined as dash", () => {
    assert.equal(formatPoints(null), "-");
    assert.equal(formatPoints(undefined), "-");
  });

  it("formats integers without decimals", () => {
    assert.equal(formatPoints(5), "5");
    assert.equal(formatPoints(0), "0");
  });

  it("formats floats with comma delimiter", () => {
    assert.equal(formatPoints(3.5), "3,5");
    assert.equal(formatPoints(1.25), "1,3"); // toFixed(1)
  });
});

describe("computeGrade", () => {
  it("returns null grade20 when no criteria are evaluated", () => {
    const result = computeGrade(sampleGrid, () => null);
    assert.equal(result.grade20, null);
    assert.equal(result.evaluatedCount, 0);
    assert.equal(result.totalCount, 3);
    assert.equal(result.complete, false);
  });

  it("computes progressive score out of 20 when totalWeight is 20", () => {
    // Total weight is 10 + 5 + 5 = 20
    // Evaluate crit-1 as Expert (100% of 10 = 10 pts)
    const marks = { "crit-1": 4 };
    const result = computeGrade(sampleGrid, (id) => marks[id]);

    assert.equal(result.evaluatedCount, 1);
    assert.equal(result.totalCount, 3);
    assert.equal(result.complete, false);
    assert.equal(result.grade20, 10);
  });

  it("scales grade when totalWeight is different from 20", () => {
    const customGrid = {
      ...sampleGrid,
      criteria: [
        { id: "c1", category_id: "cat-1", weight: 20 },
        { id: "c2", category_id: "cat-1", weight: 20 },
      ], // total 40 pts
    };
    // c1 = 100% (20 pts), c2 = 50% (10 pts) -> 30/40 pts -> 15/20
    const marks = { c1: 4, c2: 2 };
    const result = computeGrade(customGrid, (id) => marks[id]);

    assert.equal(result.complete, true);
    assert.equal(result.evaluatedCount, 2);
    assert.equal(result.grade20, 15);
  });

  it("marks complete as true only when all criteria have a grade", () => {
    const marks = { "crit-1": 4, "crit-2": 2, "crit-3": 3 };
    const result = computeGrade(sampleGrid, (id) => marks[id]);
    assert.equal(result.complete, true);
    assert.equal(result.evaluatedCount, 3);
    assert.equal(result.totalCount, 3);
  });
});

describe("computeCategoryGrades", () => {
  it("calculates earned points and weights per category", () => {
    // crit-1 (weight 10, pos 4 = 10pts), crit-2 (weight 5, pos 0 = 0pts), crit-3 (weight 5, not evaluated)
    const marks = { "crit-1": 4, "crit-2": 0 };
    const catGrades = computeCategoryGrades(sampleGrid, (id) => marks[id]);

    assert.equal(catGrades.length, 2);

    const cat1 = catGrades.find((c) => c.categoryId === "cat-1");
    assert.equal(cat1.totalWeight, 15);
    assert.equal(cat1.earnedPoints, 10);
    assert.equal(cat1.evaluatedCount, 2);
    assert.equal(cat1.totalCount, 2);
    assert.equal(cat1.complete, true);

    const cat2 = catGrades.find((c) => c.categoryId === "cat-2");
    assert.equal(cat2.totalWeight, 5);
    assert.equal(cat2.earnedPoints, 0);
    assert.equal(cat2.evaluatedCount, 0);
    assert.equal(cat2.complete, false);
    assert.equal(cat2.grade20, null);
  });
});

describe("formatGrade", () => {
  it("formats null or undefined as dash", () => {
    assert.equal(formatGrade(null), "-");
    assert.equal(formatGrade(undefined), "-");
  });

  it("formats with 1 decimal and comma", () => {
    assert.equal(formatGrade(14.5), "14,5");
    assert.equal(formatGrade(20), "20,0");
  });
});

describe("suggestAppreciation", () => {
  it("returns empty string for null or undefined", () => {
    assert.equal(suggestAppreciation(null), "");
    assert.equal(suggestAppreciation(undefined), "");
  });

  it("maps grade to corresponding appreciation", () => {
    assert.match(suggestAppreciation(6), /insuffisants/);
    assert.match(suggestAppreciation(10), /fragiles/);
    assert.match(suggestAppreciation(13), /satisfaisants/);
    assert.match(suggestAppreciation(15.5), /Bons résultats/);
    assert.match(suggestAppreciation(18), /Excellents/);
  });
});
