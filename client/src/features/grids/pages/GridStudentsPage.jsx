import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGrid } from "../../../api/grids.js";
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudentsCsv,
  importStudentsFromPromo,
} from "../../../api/students.js";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  setStudentGroup,
} from "../../../api/groups.js";
import { fetchPromos } from "../../../api/promos.js";
import Loading from "../../../components/Loading.jsx";
import Icon from "../../../components/Icon.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";
import { readCsvFile } from "../../../utils/readCsvFile.js";

export default function GridStudentsPage() {
  const { id } = useParams();
  const [grid, setGrid] = useState(null);
  useDocumentTitle(grid ? `Élèves - ${grid.name}` : "Élèves");
  const [students, setStudents] = useState(null);
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editLastName, setEditLastName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");

  const [groupName, setGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  const [promos, setPromos] = useState([]);
  const [selectedPromoId, setSelectedPromoId] = useState("");
  const [importingPromo, setImportingPromo] = useState(false);

  useEffect(() => {
    fetchGrid(id).then(setGrid).catch((e) => setError(e.message));
    fetchStudents(id).then(setStudents).catch((e) => setError(e.message));
    fetchGroups(id).then(setGroups).catch((e) => setError(e.message));
    fetchPromos().then(setPromos).catch(() => {});
  }, [id]);

  const showError = (e) => setError(e.details?.length ? e.details.join(" ") : e.message);

  const addStudent = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const created = await createStudent(id, { lastName, firstName });
      setStudents((s) => [...s, created]);
      setLastName("");
      setFirstName("");
    } catch (err) {
      showError(err);
    } finally {
      setAdding(false);
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
      const updated = await updateStudent(id, s.id, {
        lastName: editLastName,
        firstName: editFirstName,
      });
      setStudents((list) => list.map((st) => (st.id === s.id ? updated : st)));
      setEditingId(null);
    } catch (err) {
      showError(err);
    }
  };

  const removeStudent = async (s) => {
    if (!window.confirm(`Supprimer ${s.first_name} ${s.last_name} ?`)) return;
    try {
      await deleteStudent(id, s.id);
      setStudents((list) => list.filter((st) => st.id !== s.id));
    } catch (err) {
      showError(err);
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const csv = await readCsvFile(file);
      const list = await importStudentsCsv(id, csv);
      setStudents(list);
    } catch (err) {
      showError(err);
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const importFromPromo = async () => {
    if (!selectedPromoId) return;
    setImportingPromo(true);
    setError(null);
    try {
      const list = await importStudentsFromPromo(id, selectedPromoId);
      setStudents(list);
    } catch (err) {
      showError(err);
    } finally {
      setImportingPromo(false);
    }
  };

  const addGroup = async (e) => {
    e.preventDefault();
    setAddingGroup(true);
    setError(null);
    try {
      const created = await createGroup(id, groupName);
      setGroups((g) => [...g, created]);
      setGroupName("");
    } catch (err) {
      showError(err);
    } finally {
      setAddingGroup(false);
    }
  };

  const removeGroup = async (group) => {
    if (!window.confirm(`Supprimer le groupe « ${group.name} » ? Les élèves seront désassignés.`)) return;
    try {
      await deleteGroup(id, group.id);
      setGroups((g) => g.filter((gr) => gr.id !== group.id));
      setStudents((list) => list.map((s) => (s.group_id === group.id ? { ...s, group_id: null } : s)));
    } catch (err) {
      showError(err);
    }
  };

  const changeStudentGroup = async (student, groupId) => {
    setError(null);
    try {
      const updated = await setStudentGroup(id, student.id, groupId || null);
      setStudents((list) => list.map((s) => (s.id === student.id ? updated : s)));
    } catch (err) {
      showError(err);
    }
  };

  return (
    <main className="page">
      <PageHeader
        breadcrumbs={[{ label: "Mes grilles", to: "/" }, { label: grid?.name ?? "…" }, { label: "Élèves" }]}
        title={`Élèves${grid ? ` - ${grid.name}` : ""}`}
        subtitle="Ajoutez des élèves manuellement ou importez un export CSV."
        actions={<Link to="/" className="btn ghost"><Icon name="arrowLeft" />Retour</Link>}
      />

      {error && (
        <div className="error-box" role="alert">
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      )}

      <section className="section">
        <div className="section-aside">
          <span className="section-index" aria-hidden="true">01</span>
          <h2 className="section-title">Ajouter un élève</h2>
        </div>
        <div className="section-body">
          <form className="student-form" onSubmit={addStudent}>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
              aria-label="Nom"
              required
            />
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
              aria-label="Prénom"
            />
            <button type="submit" className="btn primary" disabled={adding}>
              <Icon name="plus" />
              {adding ? "Ajout…" : "Ajouter"}
            </button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-aside">
          <span className="section-index" aria-hidden="true">02</span>
          <h2 className="section-title">Importer un CSV</h2>
          <p className="hint">
            Colonnes attendues : « Nom » (obligatoire) et « Prénom ». Séparateur virgule ou
            point-virgule détecté automatiquement. Les élèves importés s'ajoutent à la liste existante.
          </p>
        </div>
        <div className="section-body">
          <input
            ref={fileInput}
            className="file-input"
            type="file"
            accept=".csv,text/csv"
            aria-label="Fichier CSV d'élèves"
            onChange={onImportFile}
            disabled={importing}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-aside">
          <span className="section-index" aria-hidden="true">03</span>
          <h2 className="section-title">Importer une promo</h2>
          {promos.length > 0 && <p className="hint">Ajoute les élèves de la promo sélectionnée à la liste existante.</p>}
        </div>
        <div className="section-body">
          {promos.length === 0 ? (
            <p className="notice"><Icon name="info" />Aucune promo disponible. Un administrateur peut en ajouter depuis le panneau admin.</p>
          ) : (
            <div className="promo-import-row">
              <div className="select-wrap">
                <select value={selectedPromoId} onChange={(e) => setSelectedPromoId(e.target.value)} aria-label="Promo">
                  <option value="">Sélectionner une promo…</option>
                  {promos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.students_count} élève{p.students_count > 1 ? "s" : ""})
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="select-chevron" />
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={importFromPromo}
                disabled={!selectedPromoId || importingPromo}
              >
                <Icon name="download" />
                {importingPromo ? "Import…" : "Importer les étudiants"}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-aside">
          <span className="section-index" aria-hidden="true">04</span>
          <h2 className="section-title">Groupes</h2>
          <p className="hint">
            Créez des groupes (ex. équipes de projet) pour pouvoir les évaluer d'un coup depuis la page Évaluer.
          </p>
        </div>
        <div className="section-body">
          <form className="student-form" onSubmit={addGroup}>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nom du groupe"
              aria-label="Nom du groupe"
              required
            />
            <button type="submit" className="btn primary" disabled={addingGroup}>
              <Icon name="plus" />
              {addingGroup ? "Ajout…" : "Ajouter"}
            </button>
          </form>
          {groups?.length > 0 && (
            <ul className="group-list">
              {groups.map((g) => {
                const memberCount = students?.filter((s) => s.group_id === g.id).length ?? 0;
                return (
                  <li key={g.id} className="group-card">
                    <div className="group-card-head">
                      <div className="cell-title">
                        <span className="row-mark" aria-hidden="true"><Icon name="users" size={16} /></span>
                        <div className="cell-stack">
                          <strong>{g.name}</strong>
                          <span className="muted cell-meta">{memberCount} élève{memberCount > 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <button type="button" className="btn text small danger" onClick={() => removeGroup(g)}>
                        <Icon name="trash" />
                        Supprimer
                      </button>
                    </div>
                    {students?.length > 0 && (
                      <fieldset className="group-members-picker">
                        <legend className="sr-only">Membres du groupe {g.name}</legend>
                        {students.map((s) => (
                          <label key={s.id} className="check">
                            <input
                              type="checkbox"
                              checked={s.group_id === g.id}
                              onChange={(e) => changeStudentGroup(s, e.target.checked ? g.id : null)}
                            />
                            <span className="check-box" aria-hidden="true"><Icon name="check" size={11} strokeWidth="3" /></span>
                            <span className="check-label">{s.last_name} {s.first_name}</span>
                          </label>
                        ))}
                      </fieldset>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="section section-stacked">
        <div className="section-head">
          <div>
            <span className="section-index" aria-hidden="true">05</span>
            <h2 className="section-title">Liste <span className="count">{students?.length ?? 0}</span></h2>
          </div>
        </div>
        {students === null && <Loading />}
        {students?.length === 0 && <p className="muted">Aucun élève pour l'instant.</p>}
        {students?.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Liste des élèves ({students.length})</caption>
              <thead>
                <tr>
                  <th scope="col">Élève</th>
                  <th scope="col">Groupe</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const groupName = groups?.find((g) => g.id === s.group_id)?.name;
                  return editingId === s.id ? (
                    <tr key={s.id} className="is-editing">
                      <td colSpan={2}>
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
                      <td>
                        <span className={`status${groupName ? "" : " is-muted"}`}>
                          <span className="status-dot" aria-hidden="true" />
                          {groupName ?? "Sans groupe"}
                        </span>
                      </td>
                      <td className="actions">
                        <div className="row-actions">
                          <button type="button" className="btn text small" onClick={() => startEdit(s)}>
                            <Icon name="pencil" />Modifier
                          </button>
                          <button type="button" className="btn text small danger" onClick={() => removeStudent(s)}>
                            <Icon name="trash" />Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
