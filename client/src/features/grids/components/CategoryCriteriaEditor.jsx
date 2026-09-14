import Icon from "../../../components/Icon.jsx";

/**
 * Édition groupée : chaque catégorie affiche directement ses critères
 * (ajout/suppression/pondération), sans sélecteur de catégorie par critère.
 */
export default function CategoryCriteriaEditor({ categories, criteria, onCategoriesChange, onCriteriaChange }) {
  const setCategory = (idx, patch) =>
    onCategoriesChange(categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const addCategory = () =>
    onCategoriesChange([...categories, { id: crypto.randomUUID(), name: "", deliverable: "" }]);
  const removeCategory = (idx) => onCategoriesChange(categories.filter((_, i) => i !== idx));

  const setCriterion = (idx, patch) =>
    onCriteriaChange(criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const addCriterion = (categoryId) =>
    onCriteriaChange([...criteria, { id: crypto.randomUUID(), name: "", weight: 1, categoryId }]);
  const removeCriterion = (idx) => onCriteriaChange(criteria.filter((_, i) => i !== idx));

  const criteriaWithIndex = criteria.map((c, i) => ({ c, i }));

  return (
    <div className="categories-editor">
      {categories.map((cat, ci) => {
        const catCriteria = criteriaWithIndex.filter(({ c }) => c.categoryId === cat.id);
        const catTotalWeight = catCriteria.reduce((s, { c }) => s + (Number(c.weight) || 0), 0);
        return (
          <div key={cat.id} className="category-block">
            <div className="category-block-head">
              <span className="category-index" aria-hidden="true">{String(ci + 1).padStart(2, "0")}</span>
              <input
                className="cat-name"
                value={cat.name}
                placeholder={`Catégorie ${ci + 1}`}
                aria-label={`Nom de la catégorie ${ci + 1}`}
                onChange={(e) => setCategory(ci, { name: e.target.value })}
              />
              <span className="cat-weight-total">Total des points : <strong>{catTotalWeight}</strong></span>
              <button
                type="button"
                className="icon-btn"
                title="Supprimer cette catégorie"
                aria-label="Supprimer cette catégorie"
                onClick={() => removeCategory(ci)}
                disabled={categories.length <= 1}
              >
                <Icon name="trash" />
              </button>
            </div>

            <label className="field cat-deliverable">
              <span>Modalité de livrable</span>
              <input
                value={cat.deliverable ?? ""}
                placeholder="Ex : dossier, soutenance, vidéo, code…"
                onChange={(e) => setCategory(ci, { deliverable: e.target.value })}
              />
            </label>

            <div className="criteria-editor">
              {catCriteria.length > 0 && (
                <div className="crit-row crit-row-head" aria-hidden="true">
                  <span className="crit-name">Critère</span>
                  <span className="crit-weight">Points</span>
                  <span className="crit-share">Part</span>
                  <span className="icon-btn-spacer" />
                </div>
              )}
              {catCriteria.length === 0 && (
                <p className="muted small">Aucun critère dans cette catégorie.</p>
              )}
              {catCriteria.map(({ c, i }) => {
                const share = catTotalWeight > 0 ? Math.round(((Number(c.weight) || 0) / catTotalWeight) * 100) : 0;
                return (
                  <div key={c.id} className="crit-row">
                    <input
                      className="crit-name"
                      value={c.name}
                      placeholder="Intitulé du critère"
                      aria-label="Intitulé du critère"
                      onChange={(e) => setCriterion(i, { name: e.target.value })}
                    />
                    <label className="crit-weight">
                      <span className="sr-only">Points</span>
                      <input
                        type="number" min="0" step="0.5"
                        value={c.weight}
                        onChange={(e) => setCriterion(i, { weight: e.target.value })}
                      />
                    </label>
                    <span className="crit-share">
                      <span className="share-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
                      {share}%
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Supprimer ce critère"
                      aria-label="Supprimer ce critère"
                      onClick={() => removeCriterion(i)}
                      disabled={criteria.length <= 1}
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button type="button" className="btn text small" onClick={() => addCriterion(cat.id)}>
              <Icon name="plus" />
              Ajouter un critère
            </button>
          </div>
        );
      })}

      <button type="button" className="btn ghost small add-category" onClick={addCategory}>
        <Icon name="plus" />
        Ajouter une catégorie
      </button>
    </div>
  );
}
