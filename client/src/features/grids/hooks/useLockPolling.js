import { useEffect, useCallback, useRef, useState } from "react";
import { fetchActiveLocks } from "../../../api/grids.js";

const POLL_ACTIVE_MS = 2_500;
const POLL_LOCKED_MS = 2_000;
const POLL_IDLE_MS = 4_000;
const POLL_HIDDEN_MS = 30_000;
const IDLE_THRESHOLD_MS = 120_000;

/**
 * Gère le polling adaptatif des verrous actifs avec détection de visibilité et d'inactivité.
 */
export function useLockPolling({
  gridId,
  enabled,
  currentUserId,
  onLockReleased,
  lastActivityRef,
}) {
  const [activeLocks, setActiveLocks] = useState({});
  const activeLocksRef = useRef({});
  const onLockReleasedRef = useRef(onLockReleased);

  useEffect(() => {
    onLockReleasedRef.current = onLockReleased;
  }, [onLockReleased]);

  const pollLocks = useCallback(async () => {
    if (!enabled) return;
    try {
      const list = await fetchActiveLocks(gridId);
      const nextMap = Object.fromEntries(list.map((item) => [item.lock_key, item]));

      const prevMap = activeLocksRef.current;
      for (const [key, prevLock] of Object.entries(prevMap)) {
        const isThirdParty = (prevLock.user_id ?? prevLock.userId) !== currentUserId;
        if (isThirdParty && !nextMap[key]) {
          onLockReleasedRef.current?.(key);
        }
      }

      activeLocksRef.current = nextMap;
      setActiveLocks(nextMap);
    } catch {
      // Échec silencieux sur le polling réseau
    }
  }, [gridId, enabled, currentUserId]);

  useEffect(() => {
    if (!enabled) return;

    let timerId = null;

    const scheduleNext = (delayMs) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(runPoll, delayMs);
    };

    const runPoll = async () => {
      if (document.hidden) {
        scheduleNext(POLL_HIDDEN_MS);
        return;
      }
      const isIdle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS;
      if (isIdle) {
        scheduleNext(POLL_IDLE_MS);
        return;
      }
      await pollLocks();
      const hasLocks = Object.keys(activeLocksRef.current).length > 0;
      scheduleNext(hasLocks ? POLL_LOCKED_MS : POLL_ACTIVE_MS);
    };

    scheduleNext(0);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastActivityRef.current = Date.now();
        scheduleNext(0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pollLocks, lastActivityRef]);

  return {
    activeLocks,
    pollLocks,
    setActiveLocks,
    activeLocksRef,
  };
}
