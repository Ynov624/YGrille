import { signAdminToken } from "../auth/jwt.js";
import { badRequest } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Mot de passe partagé du panneau admin (gestion des promos) : un secondaire simple, pas
// un compte à part entière, cf. discussion produit. Surchargeable via ADMIN_PASSWORD.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminYnov123";

export const login = asyncHandler(async (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password !== ADMIN_PASSWORD) {
    throw badRequest("Mot de passe administrateur incorrect.");
  }
  res.json({ token: signAdminToken() });
});
