import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import promosAdminRouter from "./promosAdmin.routes.js";
import usersAdminRouter from "./usersAdmin.routes.js";

const router = Router();

// Monté après `requireAuth` (cf. app.js) : un compte YGrid valide est déjà exigé,
// requireAdmin vérifie en plus qu'il a le rôle admin.
router.use(requireAdmin);
router.use("/promos", promosAdminRouter);
router.use("/users", usersAdminRouter);

export default router;
