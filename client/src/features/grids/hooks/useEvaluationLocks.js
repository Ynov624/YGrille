import { useAuth } from "../../../auth/AuthContext.jsx";
import { useGridLocks } from "./useGridLocks.js";
import { useEvaluationAutoRefresh } from "./useEvaluationAutoRefresh.js";
import { useGeneralCommentLock } from "./useGeneralCommentLock.js";
import { useCriterionRowLock } from "./useCriterionRowLock.js";
export { getStoredGeneralComment } from "../lockKeys.js";

/**
 * Orchestrateur des verrous d'évaluation pour GridEvaluatePage.
 */
export function useEvaluationLocks({
  gridId,
  grid,
  setGrid,
  mode,
  current,
  members,
  setMarks,
  setStudents,
  setComment,
}) {
  const { user } = useAuth();

  const handleLockReleased = useEvaluationAutoRefresh({
    gridId,
    setGrid,
    setMarks,
    setStudents,
  });

  const { activeLocks, heartbeatFailed, acquire, release, pollLocks, setActiveLocks } =
    useGridLocks({
      gridId,
      membersCount: grid?.members_count ?? 1,
      currentUserId: user?.id,
      onLockReleased: handleLockReleased,
    });

  const structureLock = activeLocks?.["grid:structure"];
  const structureConflict =
    structureLock && (structureLock.user_id ?? structureLock.userId) !== user?.id
      ? structureLock
      : null;

  const generalLock = useGeneralCommentLock({
    mode,
    current,
    members,
    activeLocks,
    structureConflict,
    currentUserId: user?.id,
    acquire,
    release,
    setComment,
  });

  const { getCriterionLock, releaseActiveCriterion } = useCriterionRowLock({
    mode,
    current,
    members,
    activeLocks,
    structureConflict,
    currentUserId: user?.id,
    acquire,
    release,
  });

  return {
    structureConflict,
    heartbeatFailed,
    getCriterionLock,
    releaseActiveCriterion,
    pollLocks,
    setActiveLocks,
    ...generalLock,
  };
}
