import { LEVEL_COLORS } from "../defaults.js";

/** Aperçu en lecture seule de la grille vierge, sous forme de tableau (comme l'écran d'évaluation, sans notes). */
export default function GridPreview({ name, levels, categories, criteria }) {
  const rows = categories.flatMap((cat) => {
    const catCriteria = criteria.filter((c) => c.categoryId === cat.id);
    if (catCriteria.length === 0) return [];
    const totalWeight = catCriteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    return [
      <tr key={`${cat.id}-head`} className="grid-preview-category-row">
        <td colSpan={levels.length + 2}>
          {cat.name || "Catégorie sans nom"}
          <span className="muted small"> · {totalWeight} pt{totalWeight > 1 ? "s" : ""}</span>
          {cat.deliverable && <span className="muted small"> · Livrable : {cat.deliverable}</span>}
        </td>
      </tr>,
      ...catCriteria.map((c, i) => (
        <tr key={`${cat.id}-${i}`}>
          <td>{c.name || "Critère sans nom"}</td>
          {levels.map((_, li) => <td key={li} className="grid-preview-cell" />)}
          <td className="grid-preview-weight">{Number(c.weight) || 0}</td>
        </tr>
      )),
    ];
  });

  return (
    <div className="grid-preview">
      <h3 id="grid-preview-title">{name || "Grille sans nom"}</h3>
      <div className="grid-preview-table-wrap">
        {/* RGAA 5.4 : le titre du tableau existe déjà visuellement (h3 juste au-dessus) —
            aria-labelledby l'associe programmatiquement plutôt que de dupliquer le texte
            dans une <caption>. */}
        <table className="grid-preview-table" aria-labelledby="grid-preview-title">
          <thead>
            <tr>
              <th scope="col">Critère</th>
              {levels.map((l, i) => (
                <th scope="col" key={i}>
                  <span className="level-dot" style={{ background: LEVEL_COLORS[i] }}>{i + 1}</span>
                  <span className="level-header-label">{l.label || `Niveau ${i + 1}`}<br />{Number(l.pct) || 0}%</span>
                </th>
              ))}
              <th scope="col">Points</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
