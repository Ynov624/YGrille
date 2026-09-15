import { useState } from "react";
import { Link } from "react-router-dom";
import LevelsEditor from "./LevelsEditor.jsx";
import CategoryCriteriaEditor from "./CategoryCriteriaEditor.jsx";
import GridPreview from "./GridPreview.jsx";
import { exportBlankGridPdf } from "../pdf.js";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import PageHeader from "../../../components/PageHeader.jsx";
import Icon from "../../../components/Icon.jsx";

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
      <PageHeader
        breadcrumbs={[{ label: "Mes grilles", to: "/" }, { label: title }]}
        title={title}
        subtitle={subtitle}
        actions={<Link to="/" className="btn ghost">Annuler</Link>}
      />

      <form onSubmit={submit}>
        <section className="section">
          <div className="section-aside">
            <span className="section-index" aria-hidden="true">01</span>
            <label htmlFor="grid-name" className="section-title">Nom de la grille</label>
          </div>
          <div className="section-body">
            <input
              id="grid-name"
              className="input-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Soutenance Finale"
              autoFocus
            />
          </div>
        </section>

        <section className="section">
          <div className="section-aside">
            <span className="section-index" aria-hidden="true">02</span>
            <h2 className="section-title">Niveaux d'acquisition</h2>
            <p className="hint">Cinq niveaux fixes. Le barème (%) définit la part de la note obtenue à chaque niveau.</p>
          </div>
          <div className="section-body">
            <LevelsEditor levels={levels} onChange={setLevels} />
          </div>
        </section>

        <section className="section">
          <div className="section-aside">
            <span className="section-index" aria-hidden="true">03</span>
            <h2 className="section-title">Catégories et critères</h2>
            <p className="hint">
              La note finale est la moyenne des notes de catégorie (chaque catégorie compte pour un
              poids égal). Dans une catégorie, le nombre de points d'un critère ne joue que face aux
              autres critères de cette même catégorie.
            </p>
          </div>
          <div className="section-body">
            <CategoryCriteriaEditor
              categories={categories}
              criteria={criteria}
              onCategoriesChange={updateCategories}
              onCriteriaChange={setCriteria}
            />
          </div>
        </section>

        <div className="form-footer">
          {errors && (
            <div className="error-box" role="alert">
              <Icon name="alert" />
              <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Enregistrement…" : submitLabel}
          </button>
        </div>
      </form>

      <section className="section section-stacked">
        <div className="section-head">
          <div>
            <span className="section-index" aria-hidden="true">04</span>
            <h2 className="section-title">Aperçu de la grille vierge</h2>
          </div>
          <button type="button" className="btn ghost small" onClick={exportBlank}>
            <Icon name="fileText" />
            Exporter en PDF
          </button>
        </div>
        <GridPreview name={name} levels={levels} categories={categories} criteria={criteria} />
      </section>
    </main>
  );
}
