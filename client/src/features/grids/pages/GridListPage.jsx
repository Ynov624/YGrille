import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGrids, fetchGrid, createGrid, deleteGrid, duplicateGrid } from "../../../api/grids.js";
import { exportGridJson, parseGridImportFile } from "../jsonTransfer.js";
import Loading from "../../../components/Loading.jsx";
import Menu from "../../../components/Menu.jsx";
import Icon from "../../../components/Icon.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import EmptyState from "../../../components/EmptyState.jsx";
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
      <PageHeader
        breadcrumbs={[{ label: "Espace" }, { label: "Mes grilles" }]}
        title="Mes grilles"
        subtitle="Créez une grille de compétences."
        actions={
          <>
            <button
              type="button"
              className="btn ghost"
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              <Icon name="upload" />
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
            <Link to="/grilles/nouvelle" className="btn primary">
              <Icon name="plus" />
              Nouvelle grille
            </Link>
          </>
        }
      />

      {error && <p className="error-box" role="alert"><Icon name="alert" />{error}</p>}
      {grids === null && !error && <Loading />}

      {grids?.length === 0 && (
        <EmptyState
          title="Aucune grille pour l'instant"
          action={<Link to="/grilles/nouvelle" className="btn primary"><Icon name="plus" />Créer une grille</Link>}
        >
          Commencez par créer votre première grille de notation.
        </EmptyState>
      )}

      {grids?.length > 0 && (
        <div className="table-wrap">
          <table className="data-table grids-table">
            <caption className="sr-only">Mes grilles ({grids.length})</caption>
            <thead>
              <tr>
                <th scope="col">Grille</th>
                <th scope="col" className="num">Critères</th>
                <th scope="col" className="num">Étudiants</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {grids.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="cell-title">
                      <span className="row-mark" aria-hidden="true"><Icon name="grid" size={16} /></span>
                      <div className="cell-stack">
                        <strong>{g.name}</strong>
                        <span className="muted cell-meta">
                          {g.criteria_count} critère{g.criteria_count > 1 ? "s" : ""} ·{" "}
                          {g.students_count} étudiant{g.students_count > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="num">{g.criteria_count}</td>
                  <td className="num">{g.students_count}</td>
                  <td className="actions">
                    <div className="row-actions">
                      <Link to={`/grilles/${g.id}/evaluer`} className="btn primary small" aria-label={`Évaluer ${g.name}`}>
                        Évaluer
                      </Link>
                      <Menu label={`Autres actions pour ${g.name}`}>
                        <Link to={`/grilles/${g.id}/eleves`} className="menu-item"><Icon name="users" />Élèves</Link>
                        <Link to={`/grilles/${g.id}/modifier`} className="menu-item"><Icon name="pencil" />Modifier</Link>
                        <button
                          type="button"
                          className="menu-item"
                          onClick={() => duplicate(g)}
                          disabled={duplicatingId === g.id}
                        >
                          <Icon name="copy" />
                          {duplicatingId === g.id ? "Duplication…" : "Dupliquer"}
                        </button>
                        <button
                          type="button"
                          className="menu-item"
                          onClick={() => exportGrid(g)}
                          disabled={exportingId === g.id}
                        >
                          <Icon name="download" />
                          {exportingId === g.id ? "Export…" : "Exporter"}
                        </button>
                        <div className="menu-separator" />
                        <button type="button" className="menu-item danger" onClick={() => remove(g)}>
                          <Icon name="trash" />
                          Supprimer
                        </button>
                      </Menu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
