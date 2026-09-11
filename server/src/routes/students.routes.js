import { Router } from "express";
import * as ctrl from "../controllers/students.controller.js";

const router = Router({ mergeParams: true });

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.post("/import", ctrl.importCsv);
router.post("/import-promo", ctrl.importFromPromo);
router.patch("/:id", ctrl.update);
router.put("/:id/group", ctrl.setGroup);
router.delete("/:id", ctrl.remove);

export default router;
