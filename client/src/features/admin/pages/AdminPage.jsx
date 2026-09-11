import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAdmin } from "../../../auth/AdminContext.jsx";
import {
  fetchPromosAdmin,
  fetchPromoAdmin,
  createPromoAdmin,
  renamePromoAdmin,
  deletePromoAdmin,
  addPromoStudent,
  importPromoStudentsCsv,
  updatePromoStudent,
  deletePromoStudent,
} from "../../../api/admin.js";
import { readCsvFile } from "../../../utils/readCsvFile.js";
import Loading from "../../../components/Loading.jsx";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";

/** Formulaire de mot de passe, affiché tant que le panneau admin n'est pas déverrouillé. */
function AdminLockScreen() {
  const { unlock } = useAdmin();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      await unlock(password);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Panneau admin</h1>
          <p className="sub">Gestion des promos, réservée aux administrateurs.</p>
        </div>
        <Link to="/" className="btn ghost">Retour</Link>
      </div>
      <section className="panel" style={{ maxWidth: 420 }}>
        <form className="field" onSubmit={submit}>
          <span>Mot de passe administrateur</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="error-box" role="alert">{error}</p>}
          <button type="submit" className="btn primary" disabled={checking || !password}>
            {checking ? "Vérification…" : "Déverrouiller"}
          </button>
        </form>
      </section>
    </main>
  );
}

/** Gestion des élèves d'une promo (ajout, import CSV, édition, suppression). */
function PromoStudents({ promo, onChange }) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editLastName, setEditLastName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");

  const showError = (e) => setError(e.details?.length ? e.details.join(" ") : e.message);

  const addStudent = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      await addPromoStudent(promo.id, { lastName, firstName });
      setLastName("");
      setFirstName("");
      onChange();
    } catch (err) {
      showError(err);
    } finally {
      setAdding(false);
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const csv = await readCsvFile(file);
      await importPromoStudentsCsv(promo.id, csv);
      onChange();
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditLastName(s.last_name);
    setEditFirstName(s.first_name);
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (s) => {
    setError(null);
    try {
      await updatePromoStudent(promo.id, s.id, { lastName: editLastName, firstName: editFirstName });
      setEditingId(null);
      onChange();
    } catch (err) {
      showError(err);
    }
  };

  const removeStudent = async (s) => {
    if (!window.confirm(`Supprimer ${s.first_name} ${s.last_name} de cette promo ?`)) return;
    try {
      await deletePromoStudent(promo.id, s.id);
      onChange();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="promo-students">
      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
        </div>
      )}

      <form className="student-form" onSubmit={addStudent}>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" required />
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
        <button type="submit" className="btn primary small" disabled={adding}>
          {adding ? "Ajout…" : "+ Ajouter"}
        </button>
      </form>

      <label className="field" style={{ marginTop: 12 }}>
        <span>Importer un CSV (colonnes « Nom » / « Prénom »)</span>
        <input
          ref={fileInput}
          className="file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={onImportFile}
          disabled={importing}
        />
      </label>

      {promo.students?.length > 0 ? (
        <ul className="grid-list" style={{ marginTop: 12 }}>
          {promo.students.map((s) => (
            <li key={s.id} className="card">
              {editingId === s.id ? (
                <>
                  <div className="card-info student-form">
                    <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Nom" />
                    <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="card-actions">
                    <button type="button" className="btn primary small" onClick={() => saveEdit(s)}>Enregistrer</button>
                    <button type="button" className="btn ghost small" onClick={cancelEdit}>Annuler</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-info">
                    <strong>{s.last_name} {s.first_name}</strong>
                  </div>
                  <div className="card-actions">
                    <button type="button" className="btn ghost small" onClick={() => startEdit(s)}>Modifier</button>
                    <button type="button" className="btn ghost small danger" onClick={() => removeStudent(s)}>Supprimer</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small" style={{ marginTop: 12 }}>Aucun élève dans cette promo pour l'instant.</p>
      )}
    </div>
  );
}

function AdminPromosPanel() {
  const { lock } = useAdmin();
  const [promos, setPromos] = useState(null);
  const [error, setError] = useState(null);
  const [newPromoName, setNewPromoName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const showError = (e) => setError(e.details?.length ? e.details.join(" ") : e.message);

  const reloadPromos = () => fetchPromosAdmin().then(setPromos).catch(showError);

  useEffect(() => {
    reloadPromos();
  }, []);

  const loadSelected = (id) => {
    if (!id) {
      setSelectedPromo(null);
      return;
    }
    fetchPromoAdmin(id).then(setSelectedPromo).catch(showError);
  };

  const selectPromo = (id) => {
    setSelectedId(id);
    setRenaming(false);
    loadSelected(id);
  };

  const refreshSelected = () => {
    reloadPromos();
    loadSelected(selectedId);
  };

  const createPromo = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await createPromoAdmin(newPromoName);
      setNewPromoName("");
      await reloadPromos();
      selectPromo(created.id);
    } catch (err) {
      showError(err);
    } finally {
      setCreating(false);
    }
  };

  const startRename = () => {
    setRenaming(true);
    setRenameValue(selectedPromo?.name ?? "");
  };

  const saveRename = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await renamePromoAdmin(selectedId, renameValue);
      setRenaming(false);
      refreshSelected();
    } catch (err) {
      showError(err);
    }
  };

  const removePromo = async (promo) => {
    if (!window.confirm(`Supprimer la promo « ${promo.name} » et ses ${promo.students_count} élève(s) ?`)) return;
    try {
      await deletePromoAdmin(promo.id);
      if (selectedId === promo.id) selectPromo(null);
      reloadPromos();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Panneau admin</h1>
          <p className="sub">Gérez les promos et leurs élèves, importables dans n'importe quelle grille.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" className="btn ghost small" onClick={lock}>Verrouiller</button>
          <Link to="/" className="btn ghost">Retour</Link>
        </div>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
        </div>
      )}

      <section className="panel">
        <h2>Ajouter une promo</h2>
        <form className="student-form" onSubmit={createPromo}>
          <input
            value={newPromoName}
            onChange={(e) => setNewPromoName(e.target.value)}
            placeholder="Ex : B3 Dev 2026"
            required
          />
          <button type="submit" className="btn primary small" disabled={creating}>
            {creating ? "Ajout…" : "+ Ajouter"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Promos ({promos?.length ?? 0})</h2>
        {promos === null && <Loading />}
        {promos?.length === 0 && <p className="muted">Aucune promo pour l'instant.</p>}
        {promos?.length > 0 && (
          <ul className="grid-list">
            {promos.map((p) => (
              <li key={p.id} className={`card${selectedId === p.id ? " selected" : ""}`}>
                <button type="button" className="card-info promo-select-btn" onClick={() => selectPromo(p.id)}>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.students_count} élève{p.students_count > 1 ? "s" : ""}</span>
                </button>
                <div className="card-actions">
                  <button type="button" className="btn ghost small danger" onClick={() => removePromo(p)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedPromo && (
        <section className="panel">
          <div className="page-head" style={{ marginBottom: 14 }}>
            {renaming ? (
              <form className="student-form" onSubmit={saveRename}>
                <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                <button type="submit" className="btn primary small">Enregistrer</button>
                <button type="button" className="btn ghost small" onClick={() => setRenaming(false)}>Annuler</button>
              </form>
            ) : (
              <h2 style={{ margin: 0 }}>
                {selectedPromo.name}{" "}
                <button type="button" className="btn ghost small" onClick={startRename}>Renommer</button>
              </h2>
            )}
          </div>
          <PromoStudents promo={selectedPromo} onChange={refreshSelected} />
        </section>
      )}
    </main>
  );
}

export default function AdminPage() {
  useDocumentTitle("Panneau admin");
  const { unlocked } = useAdmin();
  return unlocked ? <AdminPromosPanel /> : <AdminLockScreen />;
}
