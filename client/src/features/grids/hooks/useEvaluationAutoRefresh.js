import { useCallback } from "react";
import { fetchGrid } from "../../../api/grids.js";
import { fetchMarks } from "../../../api/marks.js";
import { fetchStudents } from "../../../api/students.js";

const markKey = (studentId, criterionId) => `${studentId}:${criterionId}`;

/**
 * Met à jour les données locales (structure, notes, élèves) lors de la libération d'un verrou tiers.
 */
export function useEvaluationAutoRefresh({ gridId, setGrid, setMarks, setStudents }) {
  return useCallback(
    (key) => {
      if (key === "grid:structure") {
        fetchGrid(gridId)
          .then(setGrid)
          .catch(() => {});
      }
      if (key.startsWith("eval:student:")) {
        fetchMarks(gridId)
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
          .catch(() => {});
        if (key.endsWith(":general")) {
          fetchStudents(gridId)
            .then(setStudents)
            .catch(() => {});
        }
      }
    },
    [gridId, setGrid, setMarks, setStudents]
  );
}
