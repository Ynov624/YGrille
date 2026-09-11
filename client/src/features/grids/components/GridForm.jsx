import { useState } from "react";
import { Link } from "react-router-dom";
import LevelsEditor from "./LevelsEditor.jsx";
import CategoryCriteriaEditor from "./CategoryCriteriaEditor.jsx";
import GridPreview from "./GridPreview.jsx";
import { exportBlankGridPdf } from "../pdf.js";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";

/** Formulaire de grille (nom, niveaux, catégories, critères), utilisé pour la création et l'édition. */
export default function GridForm({ title, subtitle, submitLabel, initial, saving, errors, onSubmit }) {
  useDocumentTitle(title);
  const [name, setName] = useState(initial.name);
  const [levels, setLevels] = useState(initial.levels);
  const [categories, setCategories] = useState(initial.categories);
  const [criteria, setCriteria] = useState(initial.criteria);

  const updateCategories = (next) => {
    const remainingIds = new Set(next.map((c) => c.id));
    setCriteria((crit) =>
      crit.map((c) => (remainingIds.has(c.categoryId) ? c : { ...c, categoryId: next[0]?.id }))
    );
    setCategories(next);
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      levels: levels.map((l) => ({ label: l.label, pct: Number(l.pct) })),
      categories: categories.map((c) => ({ name: c.name, deliverable: c.deliverable })),
      criteria: criteria.map((c) => ({
        name: c.name,
        weight: Number(c.weight),
        categoryIndex: categories.findIndex((cat) => cat.id === c.categoryId),
      })),
    });
  };

  const exportBlank = () => {
    exportBlankGridPdf({
      name,
      levels: levels.map((l) => ({ label: l.label, pct: Number(l.pct) })),
      categories,
      criteria,
    });
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="sub">{subtitle}</p>
        </div>
        <Link to="/" className="btn ghost">Annuler</Link>
      </div>

      <form onSubmit={submit}>
        <section className="panel">
          <label className="field">
            <span>Nom de la grille</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Soutenance Finale"
              autoFocus
            />
          </label>
        </section>

        <section className="panel">
          <h2>Niveaux d'acquisition</h2>
          <p className="hint">Cinq niveaux fixes. Le barème (%) définit la part de la note obtenue à chaque niveau.</p>
          <LevelsEditor levels={levels} onChange={setLevels} />
        </section>

        <section className="panel">
          <h2>Catégories et critères</h2>
          <CategoryCriteriaEditor
            categories={categories}
            criteria={criteria}
            onCategoriesChange={updateCategories}
            onCriteriaChange={setCriteria}
          />
        </section>

        {errors && (
          <div className="error-box" role="alert">
            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? "Enregistrement…" : submitLabel}
        </button>
      </form>

      <section className="panel">
        <div className="page-head" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Aperçu de la grille vierge</h2>
          <button type="button" className="btn ghost small" onClick={exportBlank}>
            Exporter en PDF
          </button>
        </div>
        <GridPreview name={name} levels={levels} categories={categories} criteria={criteria} />
      </section>
    </main>
  );
}
