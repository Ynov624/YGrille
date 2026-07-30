import { Router } from "express";
import * as ctrl from "../controllers/groups.controller.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.delete("/:id", ctrl.remove);

export default router;
