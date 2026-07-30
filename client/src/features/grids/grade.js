/**
 * Note finale = moyenne des notes de catégorie (chaque catégorie compte pour un poids égal),
 * chaque note de catégorie étant la moyenne pondérée des critères évalués de cette catégorie
 * (ramenée sur 20 en interne pour ce calcul). Le poids d'un critère ne joue donc que face aux
 * autres critères de sa propre catégorie, pas directement sur la note finale.
 * Pour l'affichage, la note de catégorie montrée à l'utilisateur n'est PAS ramenée sur 20 :
 * on affiche `earnedPoints` (somme des points obtenus) sur `totalWeight` (somme des poids de
 * tous les critères de la catégorie, évalués ou non) - cf. `earnedPoints`/`totalWeight` renvoyés
 * par `computeCategoryGrades`.
 * `getMark(criterionId)` doit renvoyer le level_position (0..4) ou null/undefined si le critère
 * n'a pas encore été évalué ; les critères non évalués sont exclus du calcul de `grade20` (note
 * partielle) mais leur poids reste compté dans `totalWeight`.
 */
function levelPctMap(levels) {
  const map = {};
  levels.forEach((l) => { map[l.position] = Number(l.pct) || 0; });
  return map;
}

function gradeForCriteria(criteriaList, levelPctByPosition, getMark) {
  let weightedSum = 0;
  let evaluatedWeight = 0;
  let evaluatedCount = 0;
  let totalWeight = 0;
  criteriaList.forEach((c) => {
    const weight = Number(c.weight) || 0;
    totalWeight += weight;
    const pos = getMark(c.id);
    if (pos === null || pos === undefined) return;
    weightedSum += weight * (levelPctByPosition[pos] ?? 0);
    evaluatedWeight += weight;
    evaluatedCount += 1;
  });

  const totalCount = criteriaList.length;
  const grade20 = evaluatedWeight > 0 ? (weightedSum / evaluatedWeight) * 0.2 : null;
  return {
    grade20,
    evaluatedCount,
    totalCount,
    complete: totalCount > 0 && evaluatedCount === totalCount,
    earnedPoints: weightedSum / 100,
    totalWeight,
  };
}

/**
 * Points obtenus sur un critère pour un niveau donné (poids × barème du niveau / 100),
 * calculés automatiquement - jamais saisis à la main. `levelPosition` peut être
 * null/undefined si le critère n'est pas encore évalué (renvoie alors null).
 */
export function criterionPoints(criterion, levelPosition, levels) {
  if (levelPosition === null || levelPosition === undefined) return null;
  const level = levels.find((l) => l.position === levelPosition);
  const pct = level ? Number(level.pct) || 0 : 0;
  return (Number(criterion.weight) || 0) * (pct / 100);
}

export function formatPoints(points) {
  if (points === null || points === undefined) return "-";
  return Number.isInteger(points) ? String(points) : points.toFixed(1).replace(".", ",");
}

/** Note par catégorie : moyenne pondérée restreinte aux critères de chaque catégorie. */
export function computeCategoryGrades(grid, getMark) {
  const levelPctByPosition = levelPctMap(grid.levels);
  return grid.categories.map((cat) => ({
    categoryId: cat.id,
    ...gradeForCriteria(grid.criteria.filter((c) => c.category_id === cat.id), levelPctByPosition, getMark),
  }));
}

export function computeGrade(grid, getMark) {
  const overall = gradeForCriteria(grid.criteria, levelPctMap(grid.levels), getMark);

  const categoryGrades = computeCategoryGrades(grid, getMark)
    .map((g) => g.grade20)
    .filter((g) => g !== null);
  const grade20 = categoryGrades.length > 0
    ? categoryGrades.reduce((s, g) => s + g, 0) / categoryGrades.length
    : null;

  return { grade20, evaluatedCount: overall.evaluatedCount, totalCount: overall.totalCount, complete: overall.complete };
}

export function formatGrade(grade20) {
  return grade20 === null || grade20 === undefined ? "-" : grade20.toFixed(1).replace(".", ",");
}

const APPRECIATION_THRESHOLDS = [
  { max: 8, text: "Résultats insuffisants, des lacunes importantes restent à combler." },
  { max: 11, text: "Résultats fragiles, un travail de consolidation est nécessaire." },
  { max: 14, text: "Résultats satisfaisants, poursuivez vos efforts." },
  { max: 16, text: "Bons résultats, continuez ainsi." },
  { max: Infinity, text: "Excellents résultats, félicitations." },
];

export function suggestAppreciation(grade20) {
  if (grade20 === null || grade20 === undefined) return "";
  return APPRECIATION_THRESHOLDS.find((a) => grade20 <= a.max)?.text ?? "";
}
