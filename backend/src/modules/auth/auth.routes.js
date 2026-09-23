import express from "express";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./controllers/AuthController.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { uploadPhoto } from "../../middlewares/upload.middleware.js";
import {
  validateLogin,
  validateVerifyEmail,
  validateResendOtp,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile,
} from "./auth.validation.js";

const router = express.Router();

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

// --------------------------------------------------
// Public Endpoints
// --------------------------------------------------

import { franchiseController } from "../franchise/controllers/franchise.controller.js";

router.post("/login", validateLogin, authController.login);
router.post("/franchise-login", franchiseController.login);
router.post("/refresh-token", authController.refresh);
router.post("/logout", authController.logout);
router.post("/verify-email", validateVerifyEmail, authController.verifyEmail);
router.post("/resend-verification", validateResendOtp, authController.resendVerificationOtp);
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", validateResetPassword, authController.resetPassword);

// --------------------------------------------------
// Authenticated Endpoints
// --------------------------------------------------

router.post("/change-password", authenticate, validateChangePassword, authController.changePassword);
router.get("/me", authenticate, authController.getMe);
router.put("/me", authenticate, validateUpdateProfile, authController.updateProfile);
router.post("/avatar", authenticate, (req, res, next) => {
  uploadPhoto.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && req.files.length > 0) {
      req.file = req.files.find(f => f.fieldname === 'avatar' || f.fieldname === 'photo') || req.files[0];
    }
    next();
  });
}, authController.uploadAvatar);

// Session management endpoints
router.get("/sessions", authenticate, authController.getSessions);
router.delete("/sessions/:sessionId", authenticate, authController.terminateSession);
router.delete("/sessions", authenticate, authController.terminateAllSessions);

export default router;
export { authController, authService, authRepository };
