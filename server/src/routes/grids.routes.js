import { Router } from "express";
import * as ctrl from "../controllers/grids.controller.js";

const router = Router();

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.get("/:id", ctrl.detail);
router.put("/:id", ctrl.update);
router.post("/:id/duplicate", ctrl.duplicate);
router.delete("/:id", ctrl.remove);

router.get("/:id/members", ctrl.listMembers);
router.post("/:id/members", ctrl.addMember);
router.patch("/:id/members/:userId", ctrl.updateMemberRole);
router.delete("/:id/members/:userId", ctrl.removeMember);
router.post("/:id/leave", ctrl.leave);

export default router;
