import { useEffect, useRef } from "react";

/**
 * Enregistre les interactions de l'utilisateur (clic, touche) pour détecter l'inactivité.
 */
export function useUserActivity(enabled = true) {
  const lastActivityRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    if (!enabled) return;

    const update = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("pointerdown", update, { passive: true });
    window.addEventListener("keydown", update, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", update);
      window.removeEventListener("keydown", update);
    };
  }, [enabled]);

  return lastActivityRef;
}
