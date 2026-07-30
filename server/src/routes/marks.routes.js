import { Router } from "express";
import * as ctrl from "../controllers/marks.controller.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.list);
router.put("/group/:groupId/:criterionId", ctrl.setGroupMark);
router.put("/:studentId/:criterionId", ctrl.setMark);

export default router;
