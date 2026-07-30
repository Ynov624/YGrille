import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGrid } from "../../../api/grids.js";
import { fetchStudents, updateStudent as updateStudentApi } from "../../../api/students.js";
import { fetchGroups } from "../../../api/groups.js";
import { fetchMarks, setMark as setMarkApi, setGroupMark as setGroupMarkApi } from "../../../api/marks.js";
import LevelPicker from "../components/LevelPicker.jsx";
import { computeGrade, computeCategoryGrades, criterionPoints, formatGrade, formatPoints, suggestAppreciation } from "../grade.js";
import { exportStudentPdf, exportAllStudentsZip } from "../pdf.js";
import { exportGradesCsv } from "../csvExport.js";
import Loading from "../../../components/Loading.jsx";

const markKey = (studentId, criterionId) => `${studentId}:${criterionId}`;

function initialsFor(entity, mode) {
  if (!entity) return "";
  if (mode === "individuel") {
    return `${entity.first_name?.[0] ?? ""}${entity.last_name?.[0] ?? ""}`.toUpperCase();
  }
  return (entity.name ?? "").slice(0, 2).toUpperCase();
}

/** Appréciation d'un critère, pour l'élève (ou le groupe) sélectionné. */
function CriterionComment({ criterion, entry, onSetComment }) {
  const storedComment = entry?.comment ?? "";
  const [commentDraft, setCommentDraft] = useState(storedComment);

  useEffect(() => {
    setCommentDraft(storedComment);
  }, [criterion.id, storedComment]);

  const commitComment = () => {
    if (commentDraft !== storedComment) onSetComment(commentDraft);
  };

  return (
    <input
      className="eval-crit-comment"
      type="text"
      placeholder="Appréciation du critère…"
      value={commentDraft}
      onChange={(e) => setCommentDraft(e.target.value)}
      onBlur={commitComment}
    />
  );
}

/** En-tête façon tableau : Critère / Niveaux / Points. */
function CriteriaTableHeader({ levels }) {
  return (
    <div className="eval-crit-row eval-table-header">
      <span className="eval-crit-name">Critère</span>
      <div className="level-picker-header">
        {levels.map((l) => (
          <span key={l.position} className="level-header-label" title={l.label}>{l.label}</span>
        ))}
      </div>
      <span className="eval-crit-points">Points</span>
    </div>
  );
}

export default function GridEvaluatePage() {
  const { id } = useParams();
  const [grid, setGrid] = useState(null);
  const [students, setStudents] = useState(null);
  const [groups, setGroups] = useState(null);
  const [marks, setMarks] = useState({});
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("individuel");
  const [index, setIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  useEffect(() => {
    fetchGrid(id).then(setGrid).catch((e) => setError(e.message));
    fetchStudents(id).then(setStudents).catch((e) => setError(e.message));
    fetchGroups(id).then(setGroups).catch((e) => setError(e.message));
    fetchMarks(id)
      .then((list) => {
        const map = {};
        list.forEach((m) => {
          map[markKey(m.student_id, m.criterion_id)] = {
            levelPosition: m.level_position,
            comment: m.comment,
          };
        });
        setMarks(map);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const switchMode = (next) => {
    setMode(next);
    setIndex(0);
  };

  const list = mode === "individuel" ? students : groups;
  const current = list?.[index] ?? null;
  const members = mode === "groupe" && current
    ? (students ?? []).filter((s) => s.group_id === current.id)
    : [];

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min((list?.length ?? 1) - 1, i + 1));

  useEffect(() => {
    if (current) setComment(mode === "individuel" ? (current.comment ?? "") : "");
  }, [mode, current?.id]);

  const groupCriterionValue = (criterionId, memberIds) => {
    if (!memberIds || memberIds.length === 0) return null;
    const values = memberIds.map((sid) => marks[markKey(sid, criterionId)]?.levelPosition ?? null);
    return values.every((v) => v === values[0]) ? values[0] : null;
  };

  const memberIdsOf = (groupId) => (students ?? []).filter((s) => s.group_id === groupId).map((s) => s.id);

  const getCurrentMark = (criterionId) => marks[markKey(current.id, criterionId)] ?? null;
  const getActiveLevel = (criterionId) => mode === "individuel"
    ? getCurrentMark(criterionId)?.levelPosition ?? null
    : groupCriterionValue(criterionId, members.map((m) => m.id));

  const grade = current && grid ? computeGrade(grid, getActiveLevel) : null;
  const categoryGrades = current && grid
    ? Object.fromEntries(computeCategoryGrades(grid, getActiveLevel).map((g) => [g.categoryId, g]))
    : null;

  const isComplete = (getMark) => grid ? computeGrade(grid, getMark).complete : false;
  const studentComplete = (studentId) => isComplete((cid) => marks[markKey(studentId, cid)]?.levelPosition ?? null);
  const groupComplete = (groupId) => {
    const ids = memberIdsOf(groupId);
    return ids.length > 0 && ids.every((sid) => studentComplete(sid));
  };

  const saveComment = async () => {
    if (!current) return;
    setSavingComment(true);
    setError(null);
    try {
      if (mode === "individuel") {
        const updated = await updateStudentApi(id, current.id, {
          lastName: current.last_name,
          firstName: current.first_name,
          comment,
        });
        setStudents((list) => list.map((s) => (s.id === current.id ? updated : s)));
      } else {
        const updated = await Promise.all(members.map((m) =>
          updateStudentApi(id, m.id, { lastName: m.last_name, firstName: m.first_name, comment })
        ));
        setStudents((list) => list.map((s) => updated.find((u) => u.id === s.id) ?? s));
      }
    } catch (err) {
      setError(err.details?.length ? err.details.join(" ") : err.message);
    } finally {
      setSavingComment(false);
    }
  };

  const applyMarkUpdate = async (studentId, criterionId, payload) => {
    setError(null);
    try {
      const updated = await setMarkApi(id, studentId, criterionId, payload);
      setMarks((m) => ({
        ...m,
        [markKey(studentId, criterionId)]: {
          levelPosition: updated.levelPosition,
          comment: updated.comment,
        },
      }));
    } catch (err) {
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const updateStudentMark = (studentId, criterionId, levelPosition) =>
    applyMarkUpdate(studentId, criterionId, { levelPosition });
  const updateCriterionComment = (studentId, criterionId, comment) =>
    applyMarkUpdate(studentId, criterionId, { comment });

  const updateGroupMark = async (groupId, criterionId, levelPosition) => {
    setError(null);
    try {
      await setGroupMarkApi(id, groupId, criterionId, levelPosition);
      setMarks((m) => {
        const next = { ...m };
        members.forEach((s) => {
          const key = markKey(s.id, criterionId);
          next[key] = { levelPosition, comment: next[key]?.comment ?? "" };
        });
        return next;
      });
    } catch (err) {
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const updateGroupCriterionComment = async (criterionId, comment) => {
    setError(null);
    try {
      const updated = await Promise.all(members.map((m) => setMarkApi(id, m.id, criterionId, { comment })));
      setMarks((prev) => {
        const next = { ...prev };
        updated.forEach((u) => {
          next[markKey(u.studentId, u.criterionId)] = { levelPosition: u.levelPosition, comment: u.comment };
        });
        return next;
      });
    } catch (err) {
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const exportCurrentPdf = () => {
    if (!current || !grid || mode !== "individuel") return;
    exportStudentPdf(grid, current, getCurrentMark);
  };

  const exportCsv = () => {
    if (!grid || !students?.length) return;
    exportGradesCsv(grid, students, (studentId, criterionId) => marks[markKey(studentId, criterionId)] ?? null);
  };

  const exportAllZip = async () => {
    if (!grid || !students?.length) return;
    setExportingZip(true);
    setError(null);
    try {
      await exportAllStudentsZip(grid, students, (studentId, criterionId) => marks[markKey(studentId, criterionId)] ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingZip(false);
    }
  };

  if (!grid || !students || !groups) {
    return (
      <main className="page">
        {error ? <p className="error-box">{error}</p> : <Loading />}
      </main>
    );
  }

  return (
    <main className="page eval-page">
      <div className="page-head">
        <div>
          <h1>Évaluer - {grid.name}</h1>
          <p className="sub">Choisissez un niveau pour chaque critère.</p>
        </div>
        <div className="page-head-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={exportCsv}
            disabled={!students?.length}
          >
            Exporter les notes (.csv)
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={exportAllZip}
            disabled={exportingZip || !students?.length}
          >
            {exportingZip ? "Export…" : "Exporter tous (.zip)"}
          </button>
          <Link to="/" className="btn ghost">Retour</Link>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <p>{error}</p>
        </div>
      )}

      {students.length === 0 ? (
        <div className="empty">
          <h2>Aucun élève dans cette grille</h2>
          <p className="muted">Ajoutez des élèves avant de saisir des évaluations.</p>
          <Link to={`/grilles/${id}/eleves`} className="btn primary">Gérer les élèves</Link>
        </div>
      ) : (
        <>
          <div className="view-toggle">
            <button
              type="button"
              className={`btn ghost small${mode === "individuel" ? " active" : ""}`}
              onClick={() => switchMode("individuel")}
            >
              Individuel
            </button>
            <button
              type="button"
              className={`btn ghost small${mode === "groupe" ? " active" : ""}`}
              onClick={() => switchMode("groupe")}
            >
              Groupe
            </button>
          </div>

          {mode === "groupe" && groups.length === 0 ? (
            <div className="empty">
              <h2>Aucun groupe configuré</h2>
              <p className="muted">Créez des groupes et assignez-y des élèves depuis la page Élèves.</p>
              <Link to={`/grilles/${id}/eleves`} className="btn primary">Gérer les groupes</Link>
            </div>
          ) : (
            <section className="panel eval-panel">
              <div className="eval-layout">
                <nav className="eval-sidebar" aria-label={mode === "individuel" ? "Liste des élèves" : "Liste des groupes"}>
                  {list.map((item, i) => {
                    const complete = mode === "individuel" ? studentComplete(item.id) : groupComplete(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`eval-sidebar-item${i === index ? " active" : ""}`}
                        onClick={() => setIndex(i)}
                      >
                        <span className="eval-sidebar-item-name">
                          {item.name ?? `${item.last_name} ${item.first_name}`}
                        </span>
                        <span
                          className={`eval-status-dot ${complete ? "complete" : "incomplete"}`}
                          title={complete ? "Évaluation complète" : "Évaluation incomplète"}
                        />
                      </button>
                    );
                  })}
                </nav>

                <div className="eval-main">
                  <div className="eval-nav">
                    <button type="button" className="btn ghost small" onClick={goPrev} disabled={index <= 0}>
                      ‹ Précédent
                    </button>
                    <div className="eval-current">
                      <span className="eval-avatar" aria-hidden="true">{initialsFor(current, mode)}</span>
                      <span className="eval-current-label">
                        {mode === "individuel" ? "Élève" : "Groupe"} {index + 1} / {list.length}
                      </span>
                      <h2 className="eval-current-name">
                        {current?.name ?? `${current?.last_name} ${current?.first_name}`}
                        {current && (
                          <span
                            className={`eval-status-dot lg ${grade?.complete ? "complete" : "incomplete"}`}
                            title={grade?.complete ? "Évaluation complète" : "Évaluation incomplète"}
                          />
                        )}
                      </h2>
                      {mode === "groupe" && (
                        <p className="eval-current-members">
                          {members.length > 0
                            ? members.map((m) => `${m.last_name} ${m.first_name}`).join(", ")
                            : "Ce groupe n'a aucun élève pour l'instant."}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={goNext}
                      disabled={index >= list.length - 1}
                    >
                      Suivant ›
                    </button>
                  </div>

                  <CriteriaTableHeader levels={grid.levels} />

                  {grid.categories.map((cat) => {
                    const catCriteria = grid.criteria.filter((c) => c.category_id === cat.id);
                    if (catCriteria.length === 0) return null;
                    const catGrade = categoryGrades?.[cat.id];
                    return (
                      <div key={cat.id} className="eval-category-block">
                        <div className="eval-category-head">
                          <h3>{cat.name}</h3>
                          {catGrade && (
                            <span className="eval-category-grade">
                              {formatPoints(catGrade.earnedPoints)} / {catGrade.totalWeight}
                            </span>
                          )}
                        </div>
                        {catCriteria.map((c) => {
                          const entry = mode === "individuel" ? marks[markKey(current.id, c.id)] ?? null : null;
                          const activeLevel = mode === "individuel"
                            ? entry?.levelPosition ?? null
                            : groupCriterionValue(c.id, members.map((m) => m.id));
                          const points = activeLevel !== null && activeLevel !== undefined
                            ? criterionPoints(c, activeLevel, grid.levels)
                            : null;
                          return (
                            <div key={c.id} className="eval-crit-block">
                              <div className="eval-crit-row">
                                <span className="eval-crit-name">{c.name}</span>
                                <LevelPicker
                                  levels={grid.levels}
                                  value={activeLevel}
                                  disabled={mode === "groupe" && members.length === 0}
                                  onChange={(pos) => mode === "individuel"
                                    ? updateStudentMark(current.id, c.id, pos)
                                    : updateGroupMark(current.id, c.id, pos)}
                                />
                                <span className="eval-crit-points">{formatPoints(points)} / {c.weight}</span>
                              </div>
                              <CriterionComment
                                criterion={c}
                                entry={entry}
                                onSetComment={(txt) => mode === "individuel"
                                  ? updateCriterionComment(current.id, c.id, txt)
                                  : updateGroupCriterionComment(c.id, txt)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {current && grade && (
                    <div className="eval-grade-block">
                      <div className="eval-grade-score">
                        <span className="eval-grade-value">{formatGrade(grade.grade20)}</span>
                        <span className="eval-grade-max">/ 20</span>
                      </div>
                      <p className="muted small">
                        {grade.evaluatedCount} / {grade.totalCount} critère{grade.totalCount > 1 ? "s" : ""} évalué
                        {grade.totalCount > 1 ? "s" : ""}
                        {!grade.complete && grade.evaluatedCount > 0 ? " - évaluation partielle" : ""}
                      </p>
                      <div className="field">
                        <span>Appréciation</span>
                        <textarea
                          rows={3}
                          value={comment}
                          placeholder={suggestAppreciation(grade.grade20) || "Aucun critère évalué pour l'instant."}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>
                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() => setComment(suggestAppreciation(grade.grade20))}
                          disabled={grade.grade20 === null}
                        >
                          Utiliser la suggestion
                        </button>
                        <button
                          type="button"
                          className="btn primary small"
                          onClick={saveComment}
                          disabled={savingComment}
                        >
                          {savingComment ? "Enregistrement…" : "Enregistrer l'appréciation"}
                        </button>
                        {mode === "individuel" && (
                          <button type="button" className="btn ghost small" onClick={exportCurrentPdf}>
                            Exporter en PDF
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
