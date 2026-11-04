import { useCallback, useEffect, useRef } from "react";
import { getCriterionLockKeys, findConflict } from "../lockKeys.js";

const CRITERION_INACTIVITY_MS = 8_000;

/**
 * Gère le bail actif de critère et fournit un accesseur pour chaque ligne d'évaluation.
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
  const activeCriterionIdRef = useRef(null);
  const activeKeysRef = useRef([]);
  const autoReleaseTimerRef = useRef(null);
  const commentFocusedRef = useRef(false);

  const clearTimer = () => {
    if (autoReleaseTimerRef.current) {
      clearTimeout(autoReleaseTimerRef.current);
      autoReleaseTimerRef.current = null;
    }
  };

  const releaseActiveCriterion = useCallback(() => {
    clearTimer();
    commentFocusedRef.current = false;
    if (activeKeysRef.current.length > 0) {
      void release(activeKeysRef.current);
      activeKeysRef.current = [];
    }
    activeCriterionIdRef.current = null;
  }, [release]);

  const scheduleInactivityRelease = useCallback(() => {
    clearTimer();
    autoReleaseTimerRef.current = setTimeout(() => {
      if (commentFocusedRef.current) return;
      releaseActiveCriterion();
    }, CRITERION_INACTIVITY_MS);
  }, [releaseActiveCriterion]);

  // Libérer le critère actif lors d'un changement d'élève ou de mode
  useEffect(() => {
    releaseActiveCriterion();
  }, [current?.id, mode, releaseActiveCriterion]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const activateCriterion = useCallback(
    async (criterionId) => {
      if (activeCriterionIdRef.current === criterionId) {
        scheduleInactivityRelease();
        return true;
      }

      // Si un autre critère était actif, le libérer d'abord
      if (activeCriterionIdRef.current && activeCriterionIdRef.current !== criterionId) {
        releaseActiveCriterion();
      }

      const keys = getCriterionLockKeys(mode, current, criterionId, members);
      if (keys.length === 0) return true;

      const res = await acquire(keys);
      if (!res?.acquired) {
        return false;
      }

      activeCriterionIdRef.current = criterionId;
      activeKeysRef.current = keys;
      scheduleInactivityRelease();
      return true;
    },
    [mode, current, members, acquire, releaseActiveCriterion, scheduleInactivityRelease]
  );

  const getCriterionLock = useCallback(
    (criterionId) => {
      const keys = getCriterionLockKeys(mode, current, criterionId, members);
      const conflict = findConflict(keys, activeLocks, currentUserId);
      const isLocked = Boolean(conflict) || Boolean(structureConflict);

      const onFocusLock = async () => {
        commentFocusedRef.current = true;
        clearTimer();
        return activateCriterion(criterionId);
      };

      const onBlurLock = () => {
        commentFocusedRef.current = false;
        scheduleInactivityRelease();
      };

      return {
        isLocked,
        conflict,
        onFocusLock,
        onBlurLock,
        activateCriterion: () => activateCriterion(criterionId),
      };
    },
    [
      mode,
      current,
      members,
      activeLocks,
      structureConflict,
      currentUserId,
      activateCriterion,
      scheduleInactivityRelease,
    ]
  );

  return {
    getCriterionLock,
    releaseActiveCriterion,
  };
}
