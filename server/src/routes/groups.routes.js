import { Router } from "express";
import * as ctrl from "../controllers/groups.controller.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.put("/:id/comment", ctrl.setComment);
router.delete("/:id", ctrl.remove);

export default router;
