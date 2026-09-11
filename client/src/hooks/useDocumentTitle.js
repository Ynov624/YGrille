import { useEffect } from "react";

/**
 * RGAA 8.9 : dans une SPA, changer de route ne recharge pas le document donc ne met
 * jamais à jour <title> tout seul — sans ça, le titre d'onglet reste figé et les
 * utilisateurs de lecteur d'écran perdent le repère de navigation entre les écrans.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Grilles de notation` : "Grilles de notation";
  }, [title]);
}
