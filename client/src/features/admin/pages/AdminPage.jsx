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
import Icon from "../../../components/Icon.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
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
      <PageHeader
        breadcrumbs={[{ label: "Espace" }, { label: "Admin" }]}
        title="Panneau admin"
        subtitle="Gestion des promos, réservée aux administrateurs."
        actions={<Link to="/" className="btn ghost"><Icon name="arrowLeft" />Retour</Link>}
      />
      <section className="lock-card">
        <span className="lock-card-icon" aria-hidden="true"><Icon name="lock" size={20} /></span>
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span>Mot de passe administrateur</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="error-box" role="alert"><Icon name="alert" />{error}</p>}
          <button type="submit" className="btn primary block" disabled={checking || !password}>
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
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      )}

      <form className="student-form" onSubmit={addStudent}>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" aria-label="Nom" required />
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" aria-label="Prénom" />
        <button type="submit" className="btn primary" disabled={adding}>
          <Icon name="plus" />
          {adding ? "Ajout…" : "Ajouter"}
        </button>
      </form>

      <label className="field">
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
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Élèves de la promo {promo.name}</caption>
            <thead>
              <tr>
                <th scope="col">Élève</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {promo.students.map((s) => (
                editingId === s.id ? (
                  <tr key={s.id} className="is-editing">
                    <td>
                      <div className="student-form">
                        <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Nom" aria-label="Nom" />
                        <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="Prénom" aria-label="Prénom" />
                      </div>
                    </td>
                    <td className="actions">
                      <div className="row-actions">
                        <button type="button" className="btn primary small" onClick={() => saveEdit(s)}>Enregistrer</button>
                        <button type="button" className="btn ghost small" onClick={cancelEdit}>Annuler</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <td><strong>{s.last_name}</strong> {s.first_name}</td>
                    <td className="actions">
                      <div className="row-actions">
                        <button type="button" className="btn text small" onClick={() => startEdit(s)}><Icon name="pencil" />Modifier</button>
                        <button type="button" className="btn text small danger" onClick={() => removeStudent(s)}><Icon name="trash" />Supprimer</button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">Aucun élève dans cette promo pour l'instant.</p>
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
      <PageHeader
        breadcrumbs={[{ label: "Espace" }, { label: "Admin" }]}
        title="Panneau admin"
        subtitle="Gérez les promos et leurs élèves, importables dans n'importe quelle grille."
        actions={
          <>
            <Link to="/" className="btn text"><Icon name="arrowLeft" />Retour</Link>
            <button type="button" className="btn ghost" onClick={lock}><Icon name="lock" />Verrouiller</button>
          </>
        }
      />

      {error && (
        <div className="error-box" role="alert">
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      )}

      <div className={`admin-layout${selectedPromo ? " has-detail" : ""}`}>
        <div className="admin-master">
          <section className="block">
            <h2 className="block-title">Ajouter une promo</h2>
            <form className="student-form" onSubmit={createPromo}>
              <input
                value={newPromoName}
                onChange={(e) => setNewPromoName(e.target.value)}
                placeholder="Ex : B3 Dev 2026"
                aria-label="Nom de la promo"
                required
              />
              <button type="submit" className="btn primary" disabled={creating}>
                <Icon name="plus" />
                {creating ? "Ajout…" : "Ajouter"}
              </button>
            </form>
          </section>

          <section className="block">
            <h2 className="block-title">Promos <span className="count">{promos?.length ?? 0}</span></h2>
            {promos === null && <Loading />}
            {promos?.length === 0 && <p className="muted">Aucune promo pour l'instant.</p>}
            {promos?.length > 0 && (
              <ul className="select-list">
                {promos.map((p) => (
                  <li key={p.id} className={`select-row${selectedId === p.id ? " selected" : ""}`}>
                    <button
                      type="button"
                      className="select-row-main"
                      aria-current={selectedId === p.id ? "true" : undefined}
                      onClick={() => selectPromo(p.id)}
                    >
                      <span className="row-mark" aria-hidden="true"><Icon name="cap" size={16} /></span>
                      <span className="cell-stack">
                        <strong>{p.name}</strong>
                        <span className="muted cell-meta">{p.students_count} élève{p.students_count > 1 ? "s" : ""}</span>
                      </span>
                    </button>
                    <button type="button" className="btn text small danger" onClick={() => removePromo(p)}>
                      <Icon name="trash" />
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {selectedPromo && (
          <section className="admin-detail">
            <div className="admin-detail-head">
              {renaming ? (
                <form className="student-form" onSubmit={saveRename}>
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} aria-label="Nom de la promo" autoFocus />
                  <button type="submit" className="btn primary small">Enregistrer</button>
                  <button type="button" className="btn ghost small" onClick={() => setRenaming(false)}>Annuler</button>
                </form>
              ) : (
                <>
                  <h2 className="block-title">{selectedPromo.name}</h2>
                  <button type="button" className="btn ghost small" onClick={startRename}>
                    <Icon name="pencil" />
                    Renommer
                  </button>
                </>
              )}
            </div>
            <PromoStudents promo={selectedPromo} onChange={refreshSelected} />
          </section>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  useDocumentTitle("Panneau admin");
  const { unlocked } = useAdmin();
  return unlocked ? <AdminPromosPanel /> : <AdminLockScreen />;
}
