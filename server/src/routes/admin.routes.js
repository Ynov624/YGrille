import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import * as ctrl from "../controllers/admin.controller.js";
import promosAdminRouter from "./promosAdmin.routes.js";

const router = Router();

// Monté après `requireAuth` (cf. app.js) : un compte YGrid valide est déjà nécessaire pour
// tenter le mot de passe admin. Les routes suivantes exigent en plus le token admin.
router.post("/login", ctrl.login);
router.use(requireAdmin);
router.use("/promos", promosAdminRouter);

export default router;
