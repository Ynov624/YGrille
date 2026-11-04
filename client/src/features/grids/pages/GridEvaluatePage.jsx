import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchGrid } from "../../../api/grids.js";
import GridShareModal from "../components/GridShareModal.jsx";
import { fetchStudents, updateStudent as updateStudentApi } from "../../../api/students.js";
import { fetchGroups, updateGroupComment as updateGroupCommentApi } from "../../../api/groups.js";
import {
  fetchMarks,
  setMark as setMarkApi,
  setGroupMark as setGroupMarkApi,
} from "../../../api/marks.js";
import LevelPicker from "../components/LevelPicker.jsx";
import CriterionComment from "../components/CriterionComment.jsx";
import LockIndicator from "../components/LockIndicator.jsx";
import EvaluationLockBanners from "../components/EvaluationLockBanners.jsx";
import { useEvaluationLocks, getStoredGeneralComment } from "../hooks/useEvaluationLocks.js";
import { LEVEL_COLORS } from "../defaults.js";
import {
  computeGrade,
  computeCategoryGrades,
  criterionPoints,
  formatGrade,
  formatPoints,
  suggestAppreciation,
} from "../grade.js";
import { exportStudentPdf, exportAllStudentsZip } from "../pdf.js";
import { exportGradesCsv } from "../csvExport.js";
import Loading from "../../../components/Loading.jsx";
import Icon from "../../../components/Icon.jsx";
import PageHeader from "../../../components/PageHeader.jsx";
import EmptyState from "../../../components/EmptyState.jsx";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle.js";

const markKey = (studentId, criterionId) => `${studentId}:${criterionId}`;

function initialsFor(entity, mode) {
  if (!entity) return "";
  if (mode === "individuel") {
    return `${entity.first_name?.[0] ?? ""}${entity.last_name?.[0] ?? ""}`.toUpperCase();
  }
  return (entity.name ?? "").slice(0, 2).toUpperCase();
}

/** En-tête façon tableau : Critère / Niveaux / Points. */
function CriteriaTableHeader({ levels }) {
  return (
    <div className="eval-crit-row eval-table-header">
      <span className="eval-crit-name">Critère</span>
      <div className="level-picker-header">
        {levels.map((l) => (
          <span
            key={l.position}
            className="level-header-label"
            title={l.label}
            style={{ "--level": LEVEL_COLORS[l.position] }}
          >
            <span className="level-header-swatch" aria-hidden="true" />
            {l.label}
          </span>
        ))}
      </div>
      <span className="eval-crit-points">Points</span>
    </div>
  );
}

export default function GridEvaluatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [grid, setGrid] = useState(null);
  useDocumentTitle(grid ? `Évaluer - ${grid.name}` : "Évaluer");
  const [students, setStudents] = useState(null);
  const [groups, setGroups] = useState(null);
  const [marks, setMarks] = useState({});
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [mode, setMode] = useState("individuel");
  const [index, setIndex] = useState(0);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  useEffect(() => {
    fetchGrid(id)
      .then(setGrid)
      .catch((e) => setError(e.message));
    fetchStudents(id)
      .then(setStudents)
      .catch((e) => setError(e.message));
    fetchGroups(id)
      .then(setGroups)
      .catch((e) => setError(e.message));
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
  const members =
    mode === "groupe" && current ? (students ?? []).filter((s) => s.group_id === current.id) : [];

  const {
    structureConflict,
    heartbeatFailed,
    isGeneralLocked,
    generalConflict,
    handleGeneralFocus: baseHandleGeneralFocus,
    handleGeneralBlur,
    releaseGeneralComment,
    getCriterionLock,
    releaseActiveCriterion,
    pollLocks,
    setActiveLocks,
  } = useEvaluationLocks({
    gridId: id,
    grid,
    setGrid,
    mode,
    current,
    members,
    setMarks,
    setStudents,
    setComment,
  });

  const handleGeneralFocus = (e) => {
    releaseActiveCriterion?.();
    baseHandleGeneralFocus(e);
  };

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min((list?.length ?? 1) - 1, i + 1));

  const [prevEntityKey, setPrevEntityKey] = useState(null);
  const currentKey = current ? `${mode}:${current.id}` : null;
  if (currentKey !== prevEntityKey) {
    setPrevEntityKey(currentKey);
    setComment(getStoredGeneralComment(mode, current, members));
  }

  const groupCriterionValue = (criterionId, memberIds) => {
    if (!memberIds || memberIds.length === 0) return null;
    const values = memberIds.map((sid) => marks[markKey(sid, criterionId)]?.levelPosition ?? null);
    return values.every((v) => v === values[0]) ? values[0] : null;
  };

  const groupCriterionComment = (criterionId, memberIds) => {
    if (!memberIds || memberIds.length === 0) return "";
    const comments = memberIds.map((sid) => marks[markKey(sid, criterionId)]?.comment ?? "");
    return comments.every((c) => c === comments[0]) ? comments[0] : "";
  };

  const memberIdsOf = (groupId) =>
    (students ?? []).filter((s) => s.group_id === groupId).map((s) => s.id);

  const getCurrentMark = (criterionId) => marks[markKey(current.id, criterionId)] ?? null;
  const getActiveLevel = (criterionId) =>
    mode === "individuel"
      ? (getCurrentMark(criterionId)?.levelPosition ?? null)
      : groupCriterionValue(
          criterionId,
          members.map((m) => m.id)
        );

  const grade = current && grid ? computeGrade(grid, getActiveLevel) : null;
  const categoryGrades =
    current && grid
      ? Object.fromEntries(
          computeCategoryGrades(grid, getActiveLevel).map((g) => [g.categoryId, g])
        )
      : null;

  const isComplete = (getMark) => (grid ? computeGrade(grid, getMark).complete : false);
  const studentComplete = (studentId) =>
    isComplete((cid) => marks[markKey(studentId, cid)]?.levelPosition ?? null);
  const groupComplete = (groupId) => {
    const ids = memberIdsOf(groupId);
    return ids.length > 0 && ids.every((sid) => studentComplete(sid));
  };

  const handleLockConflict = (err) => {
    if (err?.status === 423) {
      const detail = err.details?.[0];
      if (detail?.lockKey && detail?.userName) {
        setActiveLocks((prev) => ({
          ...prev,
          [detail.lockKey]: {
            grid_id: id,
            lock_key: detail.lockKey,
            user_id: "other",
            user_name: detail.userName,
            expires_at: Date.now() + 30_000,
          },
        }));
      }
      void pollLocks();
      return true;
    }
    return false;
  };

  const saveComment = async () => {
    if (!current || isGeneralLocked) return;
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
        await updateGroupCommentApi(id, current.id, comment);
        setStudents((list) => list.map((s) => (s.group_id === current.id ? { ...s, comment } : s)));
      }
      releaseGeneralComment();
    } catch (err) {
      if (handleLockConflict(err)) return;
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
      if (handleLockConflict(err)) return;
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const updateStudentMark = (studentId, criterionId, levelPosition) =>
    applyMarkUpdate(studentId, criterionId, { levelPosition });
  const updateCriterionComment = (studentId, criterionId, comment) =>
    applyMarkUpdate(studentId, criterionId, { comment });

  const handleLevelChange = async (criterionId, pos, activate) => {
    if (activate) {
      const ok = await activate();
      if (!ok) return;
    }
    if (mode === "individuel") {
      await updateStudentMark(current.id, criterionId, pos);
    } else {
      await updateGroupMark(current.id, criterionId, pos);
    }
  };

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
      if (handleLockConflict(err)) return;
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const updateGroupCriterionComment = async (criterionId, cmt) => {
    setError(null);
    try {
      await setGroupMarkApi(id, current.id, criterionId, { comment: cmt });
      setMarks((prev) => {
        const next = { ...prev };
        members.forEach((m) => {
          const key = markKey(m.id, criterionId);
          next[key] = {
            levelPosition: next[key]?.levelPosition ?? null,
            comment: cmt,
          };
        });
        return next;
      });
    } catch (err) {
      if (handleLockConflict(err)) return;
      setError(err.details?.length ? err.details.join(" ") : err.message);
    }
  };

  const exportCurrentPdf = () => {
    if (!current || !grid || mode !== "individuel") return;
    exportStudentPdf(grid, current, getCurrentMark);
  };

  const exportCsv = () => {
    if (!grid || !students?.length) return;
    exportGradesCsv(
      grid,
      students,
      (studentId, criterionId) => marks[markKey(studentId, criterionId)] ?? null
    );
  };

  const exportAllZip = async () => {
    if (!grid || !students?.length) return;
    setExportingZip(true);
    setError(null);
    try {
      await exportAllStudentsZip(
        grid,
        students,
        (studentId, criterionId) => marks[markKey(studentId, criterionId)] ?? null
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingZip(false);
    }
  };

  if (!grid || !students || !groups) {
    return (
      <main className="page">
        {error ? (
          <p className="error-box" role="alert">
            <Icon name="alert" />
            {error}
          </p>
        ) : (
          <Loading />
        )}
      </main>
    );
  }

  return (
    <main className="page eval-page">
      <PageHeader
        breadcrumbs={[
          { label: "Mes grilles", to: "/" },
          { label: grid.name },
          { label: "Évaluer" },
        ]}
        title={`Évaluer - ${grid.name}`}
        subtitle="Choisissez un niveau pour chaque critère."
        actions={
          <>
            <button type="button" className="btn ghost" onClick={() => setShowShareModal(true)}>
              <Icon name="userPlus" />
              Partager
            </button>
            <Link to="/" className="btn text">
              <Icon name="arrowLeft" />
              Retour
            </Link>
            <button
              type="button"
              className="btn ghost"
              onClick={exportCsv}
              disabled={!students?.length}
            >
              <Icon name="sheet" />
              Exporter les notes (.csv)
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={exportAllZip}
              disabled={exportingZip || !students?.length}
            >
              <Icon name="archive" />
              {exportingZip ? "Export…" : "Exporter tous (.zip)"}
            </button>
          </>
        }
      />

      {error && (
        <div className="error-box" role="alert">
          <Icon name="alert" />
          <p>{error}</p>
        </div>
      )}

      <EvaluationLockBanners
        structureConflict={structureConflict}
        heartbeatFailed={heartbeatFailed}
      />

      {students.length === 0 ? (
        <EmptyState
          title="Aucun élève dans cette grille"
          action={
            <Link to={`/grilles/${id}/eleves`} className="btn primary">
              <Icon name="users" />
              Gérer les élèves
            </Link>
          }
        >
          Ajoutez des élèves avant de saisir des évaluations.
        </EmptyState>
      ) : (
        <>
          <div
            className="segmented"
            data-active={mode === "individuel" ? 0 : 1}
            role="tablist"
            aria-label="Mode d'évaluation"
          >
            <span className="segmented-indicator" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={mode === "individuel"}
              className={`segmented-item${mode === "individuel" ? " active" : ""}`}
              onClick={() => switchMode("individuel")}
            >
              Individuel
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "groupe"}
              className={`segmented-item${mode === "groupe" ? " active" : ""}`}
              onClick={() => switchMode("groupe")}
            >
              Groupe
            </button>
          </div>

          {mode === "groupe" && groups.length === 0 ? (
            <EmptyState
              title="Aucun groupe configuré"
              action={
                <Link to={`/grilles/${id}/eleves`} className="btn primary">
                  <Icon name="users" />
                  Gérer les groupes
                </Link>
              }
            >
              Créez des groupes et assignez-y des élèves depuis la page Élèves.
            </EmptyState>
          ) : (
            <section className="eval-panel">
              <div className="eval-layout">
                <nav
                  className="eval-sidebar"
                  aria-label={mode === "individuel" ? "Liste des élèves" : "Liste des groupes"}
                >
                  <p className="eval-sidebar-label" aria-hidden="true">
                    {mode === "individuel" ? "Élèves" : "Groupes"}
                    <span>{list.length}</span>
                  </p>
                  {list.map((item, i) => {
                    const complete =
                      mode === "individuel" ? studentComplete(item.id) : groupComplete(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`eval-sidebar-item${i === index ? " active" : ""}`}
                        aria-current={i === index ? "true" : undefined}
                        onClick={() => setIndex(i)}
                      >
                        <span className="eval-sidebar-item-name">
                          {item.name ?? `${item.last_name} ${item.first_name}`}
                        </span>
                        <span
                          className={`eval-status-dot ${complete ? "complete" : "incomplete"}`}
                          aria-hidden="true"
                        />
                        <span className="sr-only">
                          {complete ? "Évaluation complète" : "Évaluation incomplète"}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="eval-main">
                  <div className="eval-nav">
                    <div className="eval-current">
                      <span className="eval-avatar" aria-hidden="true">
                        {initialsFor(current, mode)}
                      </span>
                      <div className="eval-current-text">
                        <span className="eval-current-label">
                          {mode === "individuel" ? "Élève" : "Groupe"} {index + 1} / {list.length}
                        </span>
                        <h2 className="eval-current-name">
                          {current?.name ?? `${current?.last_name} ${current?.first_name}`}
                          {current && (
                            <span
                              className={`eval-status-dot lg ${grade?.complete ? "complete" : "incomplete"}`}
                              title={
                                grade?.complete ? "Évaluation complète" : "Évaluation incomplète"
                              }
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
                    </div>
                    <div className="eval-stepper">
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={goPrev}
                        disabled={index <= 0}
                      >
                        <Icon name="chevronLeft" />
                        Précédent
                      </button>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={goNext}
                        disabled={index >= list.length - 1}
                      >
                        Suivant
                        <Icon name="chevronRight" />
                      </button>
                    </div>
                    <div className="eval-progress" aria-hidden="true">
                      <span style={{ width: `${((index + 1) / list.length) * 100}%` }} />
                    </div>
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
                          const { isLocked, conflict, onFocusLock, onBlurLock, activateCriterion } =
                            getCriterionLock(c.id);
                          const entry =
                            mode === "individuel"
                              ? (marks[markKey(current.id, c.id)] ?? null)
                              : {
                                  comment: groupCriterionComment(
                                    c.id,
                                    members.map((m) => m.id)
                                  ),
                                };
                          const activeLevel =
                            mode === "individuel"
                              ? (entry?.levelPosition ?? null)
                              : groupCriterionValue(
                                  c.id,
                                  members.map((m) => m.id)
                                );
                          const points =
                            activeLevel !== null && activeLevel !== undefined
                              ? criterionPoints(c, activeLevel, grid.levels)
                              : null;
                          return (
                            <div
                              key={c.id}
                              className={`eval-crit-block${isLocked ? " is-locked" : ""}`}
                            >
                              <div className="eval-crit-row">
                                <span className="eval-crit-name">
                                  {c.name}
                                  {conflict && <LockIndicator userName={conflict.user_name} />}
                                </span>
                                <LevelPicker
                                  levels={grid.levels}
                                  value={activeLevel}
                                  disabled={isLocked || (mode === "groupe" && members.length === 0)}
                                  onChange={(pos) =>
                                    handleLevelChange(c.id, pos, activateCriterion)
                                  }
                                />
                                <span className="eval-crit-points">
                                  {formatPoints(points)} / {c.weight}
                                </span>
                              </div>
                              <CriterionComment
                                criterion={c}
                                entry={entry}
                                disabled={isLocked}
                                onFocusLock={onFocusLock}
                                onBlurLock={onBlurLock}
                                onSetComment={(txt) =>
                                  mode === "individuel"
                                    ? updateCriterionComment(current.id, c.id, txt)
                                    : updateGroupCriterionComment(c.id, txt)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {current && grade && (
                    <div className="eval-grade-block">
                      <div className="eval-grade-summary">
                        <div className="eval-grade-score">
                          <span className="eval-grade-value">{formatGrade(grade.grade20)}</span>
                          <span className="eval-grade-max">/ 20</span>
                        </div>
                        <div className="meter" aria-hidden="true">
                          <span
                            style={{
                              width: `${grade.totalCount ? (grade.evaluatedCount / grade.totalCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p className="muted small">
                          {grade.evaluatedCount} / {grade.totalCount} critère
                          {grade.totalCount > 1 ? "s" : ""} évalué
                          {grade.totalCount > 1 ? "s" : ""}
                          {!grade.complete && grade.evaluatedCount > 0
                            ? " - évaluation partielle"
                            : ""}
                        </p>
                      </div>
                      <div className="eval-grade-comment">
                        <label className="field">
                          <span>
                            Appréciation
                            {generalConflict && (
                              <LockIndicator userName={generalConflict.user_name} />
                            )}
                          </span>
                          <textarea
                            rows={3}
                            value={comment}
                            placeholder={
                              suggestAppreciation(grade.grade20) ||
                              "Aucun critère évalué pour l'instant."
                            }
                            disabled={isGeneralLocked}
                            onChange={(e) => setComment(e.target.value)}
                            onFocus={handleGeneralFocus}
                            onBlur={handleGeneralBlur}
                          />
                        </label>
                        {!grade.complete && (
                          <output className="warn-box">
                            <Icon name="alert" />
                            <span>
                              Évaluation incomplète : {grade.totalCount - grade.evaluatedCount}{" "}
                              critère
                              {grade.totalCount - grade.evaluatedCount > 1 ? "s" : ""} sur{" "}
                              {grade.totalCount}{" "}
                              {grade.totalCount - grade.evaluatedCount > 1 ? "n'ont" : "n'a"} pas
                              encore été noté
                              {grade.totalCount - grade.evaluatedCount > 1 ? "s" : ""}
                              {grade.evaluatedCount > 0
                                ? ` (note provisoire : ${formatGrade(grade.grade20)} / 20)`
                                : ""}
                              .
                            </span>
                          </output>
                        )}
                        <div className="eval-grade-actions">
                          <button
                            type="button"
                            className="btn text small"
                            onClick={() => setComment(suggestAppreciation(grade.grade20))}
                            disabled={grade.grade20 === null || isGeneralLocked}
                          >
                            <Icon name="bulb" />
                            Utiliser la suggestion
                          </button>
                          <span className="spacer" />
                          {mode === "individuel" && (
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={exportCurrentPdf}
                            >
                              <Icon name="fileText" />
                              Exporter en PDF
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn primary small btn-save-comment"
                            onClick={saveComment}
                            disabled={savingComment || isGeneralLocked}
                          >
                            {savingComment ? "Enregistrement…" : "Enregistrer l'appréciation"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      {showShareModal && grid && (
        <GridShareModal
          gridId={grid.id}
          gridName={grid.name}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          currentUserRole={grid.role}
          onLeftGrid={() => navigate("/")}
        />
      )}
    </main>
  );
}
