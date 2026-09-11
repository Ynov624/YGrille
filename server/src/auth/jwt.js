import jwt from "jsonwebtoken";

const EXPIRES_IN = "7d";
const ADMIN_EXPIRES_IN = "2h";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET manquant. Définis-le dans server/.env (voir server/.env.example).");
  }
  return secret;
}

/** Signe un token JWT contenant l'identité publique de l'utilisateur. */
export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, getSecret(), {
    expiresIn: EXPIRES_IN,
  });
}

/** Vérifie un token JWT et retourne son payload, ou `null` s'il est absent/invalide/expiré. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

/** Extrait le token du header `Authorization: Bearer <token>`, ou `null` s'il est absent. */
export function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

/**
 * Token court (2h) attestant l'accès admin (mot de passe partagé, cf.
 * controllers/admin.controller.js), distinct du token utilisateur : il transite dans son
 * propre header (`X-Admin-Token`, cf. getAdminTokenFromHeader) pour ne pas remplacer le
 * `Authorization: Bearer <token>` déjà utilisé par requireAuth sur les mêmes requêtes.
 */
export function signAdminToken() {
  return jwt.sign({ role: "admin" }, getSecret(), { expiresIn: ADMIN_EXPIRES_IN });
}

/** Vérifie un token admin et retourne son payload, ou `null` s'il est absent/invalide/expiré. */
export function verifyAdminToken(token) {
  const payload = verifyToken(token);
  return payload?.role === "admin" ? payload : null;
}

/** Extrait le token du header `X-Admin-Token`, ou `null` s'il est absent. */
export function getAdminTokenFromHeader(req) {
  const header = req.headers["x-admin-token"];
  return typeof header === "string" && header ? header : null;
}
