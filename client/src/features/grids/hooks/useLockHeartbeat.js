import { useEffect } from "react";
import { acquireLocks } from "../../../api/grids.js";

/**
 * Renouvelle périodiquement (45s) les verrous détenus pour maintenir le bail de 90s.
 */
export function useLockHeartbeat({ gridId, heldKeysRef, enabled, onStatusChange }) {
  useEffect(() => {
    if (!enabled || !gridId) return;

    const interval = setInterval(async () => {
      if (heldKeysRef.current.size === 0 || document.hidden) return;
      const keys = Array.from(heldKeysRef.current);
      try {
        const res = await acquireLocks(gridId, keys);
        onStatusChange(!res?.acquired);
      } catch {
        onStatusChange(true);
      }
    }, 45_000);

    return () => clearInterval(interval);
  }, [enabled, gridId, heldKeysRef, onStatusChange]);
}
