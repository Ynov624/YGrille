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
      <h3>{name || "Grille sans nom"}</h3>
      <div className="grid-preview-table-wrap">
        <table className="grid-preview-table">
          <thead>
            <tr>
              <th>Critère</th>
              {levels.map((l, i) => (
                <th key={i}>
                  <span className="level-dot" style={{ background: LEVEL_COLORS[i] }}>{i + 1}</span>
                  <span className="level-header-label">{l.label || `Niveau ${i + 1}`}<br />{Number(l.pct) || 0}%</span>
                </th>
              ))}
              <th>Points</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}
