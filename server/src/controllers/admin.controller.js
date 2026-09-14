import { signAdminToken } from "../auth/jwt.js";
import { badRequest } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Mot de passe partagé du panneau admin (gestion des promos) : un secondaire simple, pas
// un compte à part entière, cf. discussion produit. Défini via ADMIN_PASSWORD, sans valeur
// par défaut : s'il manque, le panneau reste fermé plutôt que protégé par un mot de passe
// lisible dans le dépôt.
export const login = asyncHandler(async (req, res) => {
  const expected = process.env.ADMIN_PASSWORD;
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!expected || password !== expected) {
    throw badRequest("Mot de passe administrateur incorrect.");
  }
  res.json({ token: signAdminToken() });
});
