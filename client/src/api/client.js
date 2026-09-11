let authToken = null;
let adminToken = null;

/** Token JWT à joindre aux requêtes (voir AuthContext.jsx pour la persistance). */
export function setAuthToken(token) {
  authToken = token;
}

/** Token admin (panneau promos) à joindre en `X-Admin-Token` (voir AdminContext.jsx). */
export function setAdminToken(token) {
  adminToken = token;
}

/** Petit wrapper fetch : JSON, erreurs normalisées ({ error, details }). */
export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    // Token mort (expiré/invalide) : on arrête de le renvoyer sur les requêtes
    // suivantes. AuthContext se charge de nettoyer le localStorage et l'état user.
    if (res.status === 401) authToken = null;
    const err = new Error(data?.error || "Erreur réseau.");
    err.details = data?.details;
    err.status = res.status;
    throw err;
  }
  return data;
}
