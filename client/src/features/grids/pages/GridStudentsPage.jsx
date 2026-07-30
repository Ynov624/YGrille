import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGrid } from "../../../api/grids.js";
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  importStudentsCsv,
} from "../../../api/students.js";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  setStudentGroup,
} from "../../../api/groups.js";
import Loading from "../../../components/Loading.jsx";

/**
 * Lit un fichier CSV en détectant son encodage : Excel FR enregistre par défaut un CSV en
 * Windows-1252 (ANSI), pas en UTF-8 — décoder en UTF-8 systématiquement (`file.text()`)
 * corrompt alors les caractères accentués ("Prénom" → colonne introuvable). On repère un
 * BOM UTF-8 explicite, sinon on tente un décodage UTF-8 strict, et on retombe sur
 * Windows-1252 s'il échoue.
 */
async function readCsvFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export default function GridStudentsPage() {
  const { id } = useParams();
  const [grid, setGrid] = useState(null);
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

  useEffect(() => {
    fetchGrid(id).then(setGrid).catch((e) => setError(e.message));
    fetchStudents(id).then(setStudents).catch((e) => setError(e.message));
    fetchGroups(id).then(setGroups).catch((e) => setError(e.message));
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
      <div className="page-head">
        <div>
          <h1>Élèves{grid ? ` - ${grid.name}` : ""}</h1>
          <p className="sub">Ajoutez des élèves manuellement ou importez un export CSV.</p>
        </div>
        <Link to="/" className="btn ghost">Retour</Link>
      </div>

      {error && (
        <div className="error-box">
          <p>{error}</p>
        </div>
      )}

      <section className="panel">
        <h2>Ajouter un élève</h2>
        <form className="student-form" onSubmit={addStudent}>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom"
            required
          />
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
          />
          <button type="submit" className="btn primary small" disabled={adding}>
            {adding ? "Ajout…" : "+ Ajouter"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Importer un CSV</h2>
        <p className="hint">
          Colonnes attendues : « Nom » (obligatoire) et « Prénom ». Séparateur virgule ou
          point-virgule détecté automatiquement. Les élèves importés s'ajoutent à la liste existante.
        </p>
        <input
          ref={fileInput}
          className="file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={onImportFile}
          disabled={importing}
        />
      </section>

      <section className="panel">
        <h2>Groupes</h2>
        <p className="hint">
          Créez des groupes (ex. équipes de projet) pour pouvoir les évaluer d'un coup depuis la page Évaluer.
        </p>
        <form className="student-form" onSubmit={addGroup}>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nom du groupe"
            required
          />
          <button type="submit" className="btn primary small" disabled={addingGroup}>
            {addingGroup ? "Ajout…" : "+ Ajouter"}
          </button>
        </form>
        {groups?.length > 0 && (
          <ul className="grid-list group-list">
            {groups.map((g) => {
              const memberCount = students?.filter((s) => s.group_id === g.id).length ?? 0;
              return (
                <li key={g.id} className="card group-card">
                  <div className="group-card-head">
                    <div className="card-info">
                      <strong>{g.name}</strong>
                      <span className="muted">{memberCount} élève{memberCount > 1 ? "s" : ""}</span>
                    </div>
                    <div className="card-actions">
                      <button type="button" className="btn ghost small danger" onClick={() => removeGroup(g)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {students?.length > 0 && (
                    <div className="group-members-picker">
                      {students.map((s) => (
                        <label key={s.id} className="group-member-checkbox">
                          <input
                            type="checkbox"
                            checked={s.group_id === g.id}
                            onChange={(e) => changeStudentGroup(s, e.target.checked ? g.id : null)}
                          />
                          {s.last_name} {s.first_name}
                        </label>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Liste ({students?.length ?? 0})</h2>
        {students === null && <Loading />}
        {students?.length === 0 && <p className="muted">Aucun élève pour l'instant.</p>}
        {students?.length > 0 && (
          <ul className="grid-list">
            {students.map((s) => (
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
                      <span className="muted student-group-label">
                        {groups?.find((g) => g.id === s.group_id)?.name ?? "Sans groupe"}
                      </span>
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
        )}
      </section>
    </main>
  );
}
