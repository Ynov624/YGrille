/** Niveaux d'acquisition proposés par défaut à la création. */
export const DEFAULT_LEVELS = [
  { label: "Non évaluable", pct: 0 },
  { label: "Non acquis", pct: 25 },
  { label: "En cours d'acquisition", pct: 50 },
  { label: "Acquis", pct: 75 },
  { label: "Maîtrisé", pct: 100 },
];

export const LEVEL_COLORS = ["#b30f07", "#cc5b55", "#e0ae0a", "#7E9C52", "#3E7D5E"];

/** Descriptions des 5 niveaux d'acquisition, dans le même ordre que DEFAULT_LEVELS. */
export const LEVEL_DESCRIPTIONS = [
  "Impossible de mesurer le niveau de compétence de l'étudiant à un moment précis.",
  "La compétence n'est pas comprise.",
  "La compétence est comprise partiellement.",
  "La compétence est bien comprise et appliquée correctement.",
  "La compétence est très bien comprise, appliquée et peut être transmise.",
];
