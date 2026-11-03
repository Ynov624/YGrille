import { useRef } from "react";
import { getGeneralCommentLockKeys, findConflict, getStoredGeneralComment } from "../lockKeys.js";

/**
 * Gère le verrouillage du champ d'appréciation générale.
 */
export function useGeneralCommentLock({
  mode,
  current,
  members,
  activeLocks,
  structureConflict,
  currentUserId,
  acquire,
  release,
  setComment,
  setError,
}) {
  const generalAcquiredRef = useRef(false);

  const generalKeys = current ? getGeneralCommentLockKeys(mode, current, members) : [];
  const generalConflict = findConflict(generalKeys, activeLocks, currentUserId);
  const isGeneralLocked = Boolean(generalConflict) || Boolean(structureConflict);

  const handleGeneralFocus = async (e) => {
    if (isGeneralLocked || generalKeys.length === 0) return;
    const res = await acquire(generalKeys);
    if (!res.acquired) {
      generalAcquiredRef.current = false;
      setComment(getStoredGeneralComment(mode, current, members));
      e.target.blur();
      setError(
        `L'appréciation générale est actuellement verrouillée par ${res.lockedBy || "un autre utilisateur"}.`
      );
      return;
    }
    generalAcquiredRef.current = true;
  };

  const handleGeneralBlur = () => {
    if (generalAcquiredRef.current) {
      generalAcquiredRef.current = false;
      void release(generalKeys);
    }
  };

  const releaseGeneralComment = () => {
    if (generalKeys.length > 0) {
      void release(generalKeys);
    }
  };

  return {
    isGeneralLocked,
    generalConflict,
    handleGeneralFocus,
    handleGeneralBlur,
    releaseGeneralComment,
  };
}
