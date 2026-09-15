import * as users from "../services/users.service.js";
import { validateRolePayload } from "../utils/validate.js";
import { forbidden } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await users.listUsers());
});

// Un admin ne peut pas changer son propre rôle : ça garantit qu'il reste toujours au moins
// un administrateur (celui qui fait la modification) sans avoir à les compter.
export const updateRole = asyncHandler(async (req, res) => {
  const { role } = validateRolePayload(req.body);
  if (req.params.id === req.user.id) {
    throw forbidden("Impossible de modifier son propre rôle.");
  }
  res.json(await users.setUserRole(req.params.id, role));
});
