import { badRequest } from "./errors.js";

/**
 * Valide et normalise le payload de création d'une grille.
 * Attendu :
 * {
 *   name: string,
 *   levels: [{ label, pct }] × 5,
 *   categories: [{ name, deliverable? }] (≥ 1),
 *   criteria: [{ name, weight, categoryIndex }] (≥ 1, somme des poids > 0)
 * }
 */
export function validateGridPayload(body) {
  const errors = [];

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) errors.push("Le nom de la grille est obligatoire.");

  const levels = Array.isArray(body?.levels) ? body.levels : [];
  if (levels.length !== 5) {
    errors.push("La grille doit comporter exactement 5 niveaux d'acquisition.");
  }
  const cleanLevels = levels.slice(0, 5).map((l, i) => {
    const label = typeof l?.label === "string" ? l.label.trim() : "";
    const pct = Number(l?.pct);
    if (!label) errors.push(`Le niveau ${i + 1} doit avoir un libellé.`);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      errors.push(`Le barème du niveau ${i + 1} doit être un pourcentage entre 0 et 100.`);
    }
    return { label, pct };
  });

  const categories = Array.isArray(body?.categories) ? body.categories : [];
  if (categories.length === 0) errors.push("Ajoutez au moins une catégorie.");
  const cleanCategories = categories.map((cat, i) => {
    const cname = typeof cat?.name === "string" ? cat.name.trim() : "";
    const deliverable = typeof cat?.deliverable === "string" ? cat.deliverable.trim() : "";
    if (!cname) errors.push(`La catégorie ${i + 1} doit avoir un nom.`);
    return { name: cname, deliverable };
  });

  const criteria = Array.isArray(body?.criteria) ? body.criteria : [];
  if (criteria.length === 0) errors.push("Ajoutez au moins un critère.");
  const cleanCriteria = criteria.map((c, i) => {
    const cname = typeof c?.name === "string" ? c.name.trim() : "";
    const weight = Number(c?.weight);
    const categoryIndex = Number.isInteger(c?.categoryIndex) ? c.categoryIndex : -1;
    if (!cname) errors.push(`Le critère ${i + 1} doit avoir un intitulé.`);
    if (!Number.isFinite(weight) || weight < 0) {
      errors.push(`Le nombre de points du critère ${i + 1} doit être un nombre positif.`);
    }
    if (categoryIndex < 0 || categoryIndex >= cleanCategories.length) {
      errors.push(`Le critère ${i + 1} doit être rattaché à une catégorie.`);
    }
    return { name: cname, weight, categoryIndex };
  });
  if (cleanCriteria.length > 0 && cleanCriteria.reduce((s, c) => s + (c.weight || 0), 0) <= 0) {
    errors.push("La somme des points des critères doit être supérieure à 0.");
  }

  if (errors.length > 0) throw badRequest("Grille invalide.", errors);
  return { name, levels: cleanLevels, categories: cleanCategories, criteria: cleanCriteria };
}

/**
 * Valide et normalise le payload de création/édition d'un élève :
 * { lastName, firstName, comment? }. `comment` (appréciation) est optionnel :
 * absent, la valeur existante en base est conservée (cf. updateStudent).
 */
export function validateStudentPayload(body) {
  const errors = [];

  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim() : undefined;
  if (!lastName) errors.push("Le nom de l'élève est obligatoire.");

  if (errors.length > 0) throw badRequest("Élève invalide.", errors);
  return { lastName, firstName, comment };
}

/** Valide et normalise le payload de création/renommage d'une promo : { name }. */
export function validatePromoPayload(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) throw badRequest("Promo invalide.", ["Le nom de la promo est obligatoire."]);
  return { name };
}

/** Valide et normalise le payload d'un élève de promo : { lastName, firstName }. */
export function validatePromoStudentPayload(body) {
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  if (!lastName) throw badRequest("Élève invalide.", ["Le nom de l'élève est obligatoire."]);
  return { lastName, firstName };
}

/** Rôles possibles d'un compte (cf. contrainte CHECK de users.role dans schema.sql). */
export const ROLES = ["user", "admin"];

/** Valide le payload de changement de rôle d'un compte : { role }. */
export function validateRolePayload(body) {
  const role = body?.role;
  if (!ROLES.includes(role)) {
    throw badRequest("Rôle invalide.", ["Le rôle doit être « user » ou « admin »."]);
  }
  return { role };
}

/** Valide le payload de saisie d'une note de groupe : { levelPosition } (entier 0..4). */
export function validateGroupMarkPayload(body) {
  const levelPosition = Number(body?.levelPosition);
  if (!Number.isInteger(levelPosition) || levelPosition < 0 || levelPosition > 4) {
    throw badRequest("Note invalide.", ["Le niveau doit être un entier entre 0 et 4."]);
  }
  return { levelPosition };
}

/**
 * Valide le payload de mise à jour (partielle) d'une note individuelle :
 * { levelPosition?, comment? }. Au moins un champ doit être fourni ; les champs
 * absents conservent leur valeur existante (cf. marks.service.js). Les points
 * ne se saisissent pas : ils sont dérivés automatiquement du niveau (poids ×
 * barème du niveau), comme la note de catégorie.
 */
export function validateMarkPayload(body) {
  const errors = [];
  const result = {};

  if (body?.levelPosition !== undefined) {
    const levelPosition = Number(body.levelPosition);
    if (!Number.isInteger(levelPosition) || levelPosition < 0 || levelPosition > 4) {
      errors.push("Le niveau doit être un entier entre 0 et 4.");
    } else {
      result.levelPosition = levelPosition;
    }
  }

  if (body?.comment !== undefined) {
    result.comment = typeof body.comment === "string" ? body.comment.trim() : "";
  }

  if (Object.keys(result).length === 0) {
    errors.push("Aucune valeur à enregistrer.");
  }

  if (errors.length > 0) throw badRequest("Note invalide.", errors);
  return result;
}
