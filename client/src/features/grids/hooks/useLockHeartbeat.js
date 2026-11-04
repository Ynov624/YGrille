import { useEffect } from "react";
import { acquireLocks } from "../../../api/grids.js";

/**
 * Renouvelle périodiquement (45s) les verrous détenus pour maintenir le bail de 90s.
 */
export function useLockHeartbeat({ gridId, heldKeysRef, enabled, onStatusChange }) {
  useEffect(() => {
    if (!enabled || !gridId) return;

    const renew = async () => {
      if (heldKeysRef.current.size === 0 || document.hidden) return;
      const keys = Array.from(heldKeysRef.current);
      try {
        const res = await acquireLocks(gridId, keys);
        onStatusChange(!res?.acquired);
      } catch {
        onStatusChange(true);
      }
    };

    const interval = setInterval(renew, 45_000);

    const handleVisibility = () => {
      if (!document.hidden && heldKeysRef.current.size > 0) {
        void renew();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, gridId, heldKeysRef, onStatusChange]);
}
