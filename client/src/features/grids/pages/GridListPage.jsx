import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGrids, deleteGrid, duplicateGrid } from "../../../api/grids.js";
import Loading from "../../../components/Loading.jsx";
import Menu from "../../../components/Menu.jsx";

export default function GridListPage() {
  const [grids, setGrids] = useState(null);
  const [error, setError] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);

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

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Mes grilles</h1>
          <p className="sub">Créez une grille de compétences.</p>
        </div>
        <Link to="/grilles/nouvelle" className="btn primary">+ Nouvelle grille</Link>
      </div>

      {error && <p className="error-box">{error}</p>}
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
                <Link to={`/grilles/${g.id}/evaluer`} className="btn primary small">Évaluer</Link>
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
