import { useCallback } from "react";
import { getCriterionLockKeys, findConflict } from "../lockKeys.js";

/**
 * Fournit un accesseur pour les verrous de critère sur chaque ligne d'évaluation.
 */
export function useCriterionRowLock({
  mode,
  current,
  members,
  activeLocks,
  structureConflict,
  currentUserId,
  acquire,
  release,
}) {
  return useCallback(
    (criterionId) => {
      const keys = getCriterionLockKeys(mode, current, criterionId, members);
      const conflict = findConflict(keys, activeLocks, currentUserId);
      const isLocked = Boolean(conflict) || Boolean(structureConflict);

      const onFocusLock = async () => {
        if (keys.length === 0) return true;
        const res = await acquire(keys);
        if (!res.acquired) {
          return false;
        }
        return true;
      };

      const onBlurLock = () => {
        if (keys.length > 0) {
          void release(keys);
        }
      };

      return { isLocked, conflict, onFocusLock, onBlurLock };
    },
    [mode, current, members, activeLocks, structureConflict, currentUserId, acquire, release]
  );
}
