import { Router } from "express";
import * as ctrl from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", ctrl.register);
router.post("/verify-email", ctrl.verifyEmail);
router.post("/resend-code", ctrl.resendCode);
router.post("/login", ctrl.login);
router.post("/logout", ctrl.logout);
router.get("/me", ctrl.me);

export default router;
