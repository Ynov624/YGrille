import { getAdminTokenFromHeader, verifyAdminToken } from "../auth/jwt.js";

/** Gate le panneau admin (gestion des promos) : nécessite un token admin valide (cf. jwt.js), obtenu via POST /api/admin/login. */
export function requireAdmin(req, res, next) {
  const payload = verifyAdminToken(getAdminTokenFromHeader(req));
  if (!payload) {
    return res.status(401).json({ error: "Accès administrateur requis." });
  }
  next();
}
