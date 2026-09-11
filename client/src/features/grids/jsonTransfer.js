import { triggerBlobDownload, sanitizeFileName } from "./download.js";

/**
 * Reshape une grille (forme API, avec ids) en payload de création : sans ids,
 * `categoryIndex` à la place de `category_id`. Même transformation que
 * `duplicateGrid` côté serveur - c'est la forme attendue par `createGrid`.
 */
export function gridToImportPayload(grid) {
  return {
    name: grid.name,
    levels: grid.levels.map((l) => ({ label: l.label, pct: l.pct })),
    categories: grid.categories.map((cat) => ({ name: cat.name, deliverable: cat.deliverable })),
    criteria: grid.criteria.map((c) => ({
      name: c.name,
      weight: c.weight,
      categoryIndex: grid.categories.findIndex((cat) => cat.id === c.category_id),
    })),
  };
}

/** Télécharge la définition d'une grille (niveaux, catégories, critères) au format JSON. */
export function exportGridJson(grid) {
  const payload = gridToImportPayload(grid);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerBlobDownload(blob, sanitizeFileName(grid.name || "grille") + ".json");
}

/** Lit un fichier .json exporté depuis l'app et renvoie le payload prêt pour `createGrid()`. */
export async function parseGridImportFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Fichier JSON invalide : impossible de lire la grille.");
  }
}
