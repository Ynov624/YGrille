import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext.jsx";
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
  fetchUsersAdmin,
  updateUserRoleAdmin,
} from "../../../api/admin.js";
import { readCsvFile } from "../../../utils/readCsvFile.js";
import Loading from "../../../components/Loading.jsx";
import Icon from "../../../components/Icon.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";

const ROLE_LABELS = { admin: "Administrateur", user: "Utilisateur" };

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

/** Promos et leurs élèves, importables dans n'importe quelle grille. */
function PromosPanel() {
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
    <>
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
    </>
  );
}

/** Comptes inscrits et attribution du rôle administrateur. */
function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const showError = (e) => setError(e.details?.length ? e.details.join(" ") : e.message);

  useEffect(() => {
    fetchUsersAdmin().then(setUsers).catch(showError);
  }, []);

  const toggleRole = async (u) => {
    const role = u.role === "admin" ? "user" : "admin";
    const who = u.name || u.email;
    const question = role === "admin"
      ? `Donner les droits administrateur à ${who} ?`
      : `Retirer les droits administrateur à ${who} ?`;
    if (!window.confirm(question)) return;
    setSavingId(u.id);
    setError(null);
    try {
      const updated = await updateUserRoleAdmin(u.id, role);
      setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      showError(err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      {error && (
        <div className="error-box" role="alert">
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      )}

      <section className="block">
        <h2 className="block-title">Utilisateurs <span className="count">{users?.length ?? 0}</span></h2>
        <p className="muted">Les administrateurs ont accès à ce panneau : promos et gestion des rôles.</p>
        {users === null && <Loading />}
        {users?.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Comptes et rôles</caption>
              <thead>
                <tr>
                  <th scope="col">Compte</th>
                  <th scope="col">Rôle</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="cell-stack">
                        <strong>{u.name || u.email}</strong>
                        {u.name && <span className="muted cell-meta">{u.email}</span>}
                      </span>
                    </td>
                    <td>
                      <span className={`status${u.role === "admin" ? "" : " is-muted"}`}>
                        <span className="status-dot" aria-hidden="true" />
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="actions">
                      {u.id === currentUser.id ? (
                        <span className="muted cell-meta">Vous</span>
                      ) : (
                        <button
                          type="button"
                          className={`btn text small${u.role === "admin" ? " danger" : ""}`}
                          onClick={() => toggleRole(u)}
                          disabled={savingId === u.id}
                        >
                          <Icon name="shield" />
                          {u.role === "admin" ? "Retirer admin" : "Nommer admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const TABS = [
  { id: "promos", label: "Promos" },
  { id: "utilisateurs", label: "Utilisateurs" },
];

export default function AdminPage() {
  useDocumentTitle("Panneau admin");
  const [tab, setTab] = useState("promos");

  return (
    <main className="page">
      <PageHeader
        breadcrumbs={[{ label: "Espace" }, { label: "Admin" }]}
        title="Panneau admin"
        subtitle="Gérez les promos, importables dans n'importe quelle grille, et les administrateurs."
        actions={<Link to="/" className="btn ghost"><Icon name="arrowLeft" />Retour</Link>}
      />

      <div className="segmented" data-active={TABS.findIndex((t) => t.id === tab)} role="group" aria-label="Section du panneau admin">
        <span className="segmented-indicator" aria-hidden="true" />
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`segmented-item${tab === t.id ? " active" : ""}`}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "promos" ? <PromosPanel /> : <UsersPanel />}
    </main>
  );
}
