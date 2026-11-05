import { useCallback, useRef, useState } from "react";
import { acquireLocks, releaseLocks } from "../../../api/grids.js";
import { useUserActivity } from "./useUserActivity.js";
import { useLockHeartbeat } from "./useLockHeartbeat.js";
import { useLockUnload } from "./useLockUnload.js";
import { useLockPolling } from "./useLockPolling.js";

/**
 * Hook orchestrateur de la concurrence temps réel et des verrous de champs.
 */
export function useGridLocks({ gridId, membersCount = 1, currentUserId, onLockReleased }) {
  const [heartbeatFailed, setHeartbeatFailed] = useState(false);
  const isShared = membersCount > 1 && Boolean(gridId);
  const heldKeysRef = useRef(new Set());

  const lastActivityRef = useUserActivity(isShared);

  const { activeLocks, pollLocks, setActiveLocks, activeLocksRef } = useLockPolling({
    gridId,
    enabled: isShared,
    currentUserId,
    onLockReleased,
    lastActivityRef,
  });

  useLockHeartbeat({
    gridId,
    heldKeysRef,
    enabled: isShared,
    onStatusChange: setHeartbeatFailed,
  });

  useLockUnload({
    gridId,
    heldKeysRef,
    enabled: isShared,
  });

  const acquire = useCallback(
    async (keys) => {
      if (!isShared || !keys?.length) return { acquired: true, expiresAt: 0 };
      try {
        const res = await acquireLocks(gridId, keys);
        if (res?.acquired) {
          for (const key of keys) heldKeysRef.current.add(key);
          setHeartbeatFailed(false);
          void pollLocks();
        } else {
          if (res?.lockedBy) {
            setActiveLocks((prev) => {
              const next = { ...prev };
              for (const k of keys) {
                next[k] = {
                  grid_id: gridId,
                  lock_key: k,
                  user_id: "other",
                  user_name: res.lockedBy,
                  expires_at: res.expiresAt || Date.now() + 30_000,
                };
              }
              activeLocksRef.current = next;
              return next;
            });
          }
          void pollLocks();
        }
        return res;
      } catch (err) {
        void pollLocks();
        return { acquired: false, error: err.message };
      }
    },
    [gridId, isShared, pollLocks, setActiveLocks, activeLocksRef]
  );

  const release = useCallback(
    async (keys) => {
      if (!isShared || !keys?.length) return;
      for (const key of keys) heldKeysRef.current.delete(key);
      try {
        await releaseLocks(gridId, keys);
        setActiveLocks((prev) => {
          const next = { ...prev };
          for (const key of keys) {
            if ((next[key]?.user_id ?? next[key]?.userId) === currentUserId) {
              delete next[key];
            }
          }
          activeLocksRef.current = next;
          return next;
        });
      } catch {
        // Ignorer les erreurs réseau de libération
      }
    },
    [gridId, isShared, currentUserId, setActiveLocks, activeLocksRef]
  );

  return {
    activeLocks,
    heartbeatFailed,
    acquire,
    release,
    pollLocks,
    setActiveLocks,
  };
}
