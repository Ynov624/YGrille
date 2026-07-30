import { Router } from "express";
import * as ctrl from "../controllers/grids.controller.js";

const router = Router();

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.detail);
router.put("/:id", ctrl.update);
router.post("/:id/duplicate", ctrl.duplicate);
router.delete("/:id", ctrl.remove);

export default router;
