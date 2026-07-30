import { getTokenFromHeader, verifyToken } from "../auth/jwt.js";

export function requireAuth(req, res, next) {
  const user = verifyToken(getTokenFromHeader(req));
  if (!user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  req.user = user;
  next();
}
