import { useEffect } from "react";
import { releaseLocks } from "../../../api/grids.js";
import { getAuthToken } from "../../../api/client.js";

/**
 * Libère proprement les verrous lors de la fermeture d'onglet (pagehide/beforeunload)
 * ou du démontage du composant.
 */
export function useLockUnload({ gridId, heldKeysRef, enabled }) {
  useEffect(() => {
    if (!enabled || !gridId) return;

    const heldKeys = heldKeysRef.current;

    const sendKeepaliveRelease = () => {
      if (heldKeys.size === 0) return;
      const token = getAuthToken();
      const keys = Array.from(heldKeys);
      void fetch(`/api/grids/${gridId}/locks/release`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ keys }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", sendKeepaliveRelease);
    window.addEventListener("beforeunload", sendKeepaliveRelease);

    return () => {
      window.removeEventListener("pagehide", sendKeepaliveRelease);
      window.removeEventListener("beforeunload", sendKeepaliveRelease);

      if (heldKeys.size > 0) {
        const keys = Array.from(heldKeys);
        heldKeys.clear();
        void releaseLocks(gridId, keys).catch(() => {});
      }
    };
  }, [enabled, gridId, heldKeysRef]);
}
