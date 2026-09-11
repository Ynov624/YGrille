import { Router } from "express";
import * as ctrl from "../controllers/promosAdmin.controller.js";

const router = Router();

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.detail);
router.patch("/:id", ctrl.rename);
router.delete("/:id", ctrl.remove);
router.post("/:id/students", ctrl.addStudent);
router.post("/:id/students/import", ctrl.importCsv);
router.patch("/:id/students/:studentId", ctrl.updateStudent);
router.delete("/:id/students/:studentId", ctrl.removeStudent);

export default router;
