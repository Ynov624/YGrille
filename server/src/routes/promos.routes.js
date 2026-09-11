import { Router } from "express";
import * as ctrl from "../controllers/promos.controller.js";

const router = Router();

router.get("/", ctrl.list);

export default router;
