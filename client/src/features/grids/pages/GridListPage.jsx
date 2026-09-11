import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGrids, fetchGrid, createGrid, deleteGrid, duplicateGrid } from "../../../api/grids.js";
import { exportGridJson, parseGridImportFile } from "../jsonTransfer.js";
import Loading from "../../../components/Loading.jsx";
import Menu from "../../../components/Menu.jsx";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";

export default function GridListPage() {
  useDocumentTitle("Mes grilles");
  const [grids, setGrids] = useState(null);
  const [error, setError] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);

  const showError = (e) => setError(e.details?.length ? e.details.join(" ") : e.message);

  useEffect(() => {
    fetchGrids().then(setGrids).catch((e) => setError(e.message));
  }, []);

  const remove = async (grid) => {
    if (!window.confirm(`Supprimer la grille « ${grid.name} » ? Cette action est irréversible.`)) return;
    try {
      await deleteGrid(grid.id);
      setGrids((gs) => gs.filter((g) => g.id !== grid.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const duplicate = async (grid) => {
    setDuplicatingId(grid.id);
    setError(null);
    try {
      const created = await duplicateGrid(grid.id);
      setGrids((gs) => [
        { id: created.id, name: created.name, created_at: created.created_at, criteria_count: created.criteria.length, students_count: 0 },
        ...gs,
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setDuplicatingId(null);
    }
  };

  const exportGrid = async (grid) => {
    setExportingId(grid.id);
    setError(null);
    try {
      const full = await fetchGrid(grid.id);
      exportGridJson(full);
    } catch (e) {
      showError(e);
    } finally {
      setExportingId(null);
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const payload = await parseGridImportFile(file);
      const created = await createGrid(payload);
      setGrids((gs) => [
        { id: created.id, name: created.name, created_at: created.created_at, criteria_count: created.criteria.length, students_count: 0 },
        ...gs,
      ]);
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Mes grilles</h1>
          <p className="sub">Créez une grille de compétences.</p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? "Import…" : "Importer"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            onChange={onImportFile}
            disabled={importing}
            style={{ display: "none" }}
          />
          <Link to="/grilles/nouvelle" className="btn primary">+ Nouvelle grille</Link>
        </div>
      </div>

      {error && <p className="error-box" role="alert">{error}</p>}
      {grids === null && !error && <Loading />}

      {grids?.length === 0 && (
        <div className="empty">
          <h2>Aucune grille pour l'instant</h2>
          <p className="muted">Commencez par créer votre première grille de notation.</p>
          <Link to="/grilles/nouvelle" className="btn primary">Créer une grille</Link>
        </div>
      )}

      {grids?.length > 0 && (
        <ul className="grid-list">
          {grids.map((g) => (
            <li key={g.id} className="card">
              <div className="card-info">
                <strong>{g.name}</strong>
                <span className="muted">
                  {g.criteria_count} critère{g.criteria_count > 1 ? "s" : ""} ·{" "}
                  {g.students_count} étudiant{g.students_count > 1 ? "s" : ""}
                </span>
              </div>
              <div className="card-actions">
                <Link to={`/grilles/${g.id}/evaluer`} className="btn primary small" aria-label={`Évaluer ${g.name}`}>
                  Évaluer
                </Link>
                <Menu label={`Autres actions pour ${g.name}`}>
                  <Link to={`/grilles/${g.id}/eleves`} className="menu-item">Élèves</Link>
                  <Link to={`/grilles/${g.id}/modifier`} className="menu-item">Modifier</Link>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => duplicate(g)}
                    disabled={duplicatingId === g.id}
                  >
                    {duplicatingId === g.id ? "Duplication…" : "Dupliquer"}
                  </button>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => exportGrid(g)}
                    disabled={exportingId === g.id}
                  >
                    {exportingId === g.id ? "Export…" : "Exporter"}
                  </button>
                  <div className="menu-separator" />
                  <button type="button" className="menu-item danger" onClick={() => remove(g)}>
                    Supprimer
                  </button>
                </Menu>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
