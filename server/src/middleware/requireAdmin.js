import { findUserById } from "../services/users.service.js";
import { forbidden } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Gate le panneau admin (promos, rôles). Monté après requireAuth (req.user renseigné) : le
 * rôle est relu en base à chaque requête plutôt que porté par le JWT, pour qu'un retrait
 * des droits prenne effet tout de suite et non à l'expiration du token (7 jours).
 */
export const requireAdmin = asyncHandler(async (req, _res, next) => {
  const user = await findUserById(req.user.id);
  if (user?.role !== "admin") {
    throw forbidden("Accès administrateur requis.");
  }
  next();
});
