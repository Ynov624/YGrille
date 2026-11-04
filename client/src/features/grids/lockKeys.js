/**
 * Utilitaires purs de résolution de clés de verrouillage et détection de conflits.
 */

export function getCriterionLockKeys(mode, current, criterionId, members = []) {
  if (mode === "individuel") {
    return current?.id ? [`eval:student:${current.id}:crit:${criterionId}`] : [];
  }
  return members.map((m) => `eval:student:${m.id}:crit:${criterionId}`);
}

export function getGeneralCommentLockKeys(mode, current, members = []) {
  if (mode === "individuel") {
    return current?.id ? [`eval:student:${current.id}:general`] : [];
  }
  return members.map((m) => `eval:student:${m.id}:general`);
}

export function getStoredGeneralComment(mode, current, members = []) {
  if (mode === "individuel") {
    return current?.comment ?? "";
  }
  if (!members.length) {
    return "";
  }
  const firstComment = members[0].comment ?? "";
  const allMatch = members.every((m) => (m.comment ?? "") === firstComment);
  return allMatch ? firstComment : "";
}

/**
 * Recherche un conflit actif dans les verrous pour les clés données.
 * Vérifie également si un verrou 'grid:structure' est actif par un tiers.
 */
export function findConflict(lockKeys, activeLocks, currentUserId) {
  if (!activeLocks) return null;

  // Si la structure du barème est verrouillée par un autre utilisateur
  const structureLock = activeLocks["grid:structure"];
  if (structureLock && (structureLock.user_id ?? structureLock.userId) !== currentUserId) {
    return structureLock;
  }

  const keys = Array.isArray(lockKeys) ? lockKeys : [lockKeys];
  for (const key of keys) {
    const lock = activeLocks[key];
    if (lock && (lock.user_id ?? lock.userId) !== currentUserId) {
      return lock;
    }
  }

  return null;
}
