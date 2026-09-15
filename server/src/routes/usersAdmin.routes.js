import { Router } from "express";
import * as ctrl from "../controllers/usersAdmin.controller.js";

const router = Router();

router.get("/", ctrl.list);
router.patch("/:id", ctrl.updateRole);

export default router;
