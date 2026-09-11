import * as promos from "../services/promos.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/** Liste en lecture seule, utilisée par le sélecteur de promo à l'import dans une grille. */
export const list = asyncHandler(async (req, res) => {
  res.json(await promos.listPromos());
});
