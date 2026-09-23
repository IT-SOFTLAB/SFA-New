import { BaseController } from '../../../shared/base/BaseController.js';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';

/**
 * Auth Controller - Enterprise Modular Monolith
 * Handles all authentication-related HTTP endpoints
 */
export class AuthController extends BaseController {
  constructor(authService) {
    super(authService);
    this.allowedFilters = ['email', 'status', 'emailVerified'];
  }

  /**
   * User login
   */
  login = this.asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    const requestMeta = { ...this.extractRequestMeta(req), rememberMe: !!rememberMe };

    const result = await this.service.login(email, password, requestMeta);

    // Handle email verification required
    if (!result.emailVerified) {
      return this.handleSuccess(res, {
        emailVerified: false,
        email: result.email,
      }, 'Email verification required');
    }

    // Handle password expiration
    if (result.passwordExpired) {
      return this.handleSuccess(res, {
        emailVerified: true,
        passwordExpired: true,
        email: result.email,
      }, 'Password has expired. Please reset your password.');
    }

    // Set secure HTTP-only cookie with refresh token
    this.setRefreshTokenCookie(res, result.refreshToken);

    return this.handleSuccess(res, {
      emailVerified: true,
      user: result.user,
      tokens: { accessToken: result.accessToken },
    }, AUTH_CONSTANTS.MESSAGES.LOGIN_SUCCESS);
  });

  /**
   * Refresh access token using refresh token rotation (RTR)
   */
  refresh = this.asyncHandler(async (req, res) => {
    const oldRefreshToken = req.cookies[AUTH_CONSTANTS.COOKIES.REFRESH_TOKEN] || req.body.refreshToken;
    
    if (!oldRefreshToken) {
      return this.handleError(res, null, 'Refresh token missing', 401);
    }

    const requestMeta = this.extractRequestMeta(req);
    const result = await this.service.refresh(oldRefreshToken, requestMeta);

    // Set new refresh token cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return this.handleSuccess(res, {
      user: result.user,
      tokens: { accessToken: result.accessToken },
    }, AUTH_CONSTANTS.MESSAGES.TOKEN_REFRESHED);
  });

  /**
   * User logout
   */
  logout = this.asyncHandler(async (req, res) => {
    const refreshToken = req.cookies[AUTH_CONSTANTS.COOKIES.REFRESH_TOKEN] || req.body.refreshToken;
    const requestMeta = this.extractRequestMeta(req);

    if (refreshToken) {
      await this.service.logout(refreshToken, requestMeta);
    }

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.LOGOUT_SUCCESS);
  });

  /**
   * Verify email with OTP
   */
  verifyEmail = this.asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    
    await this.service.verifyEmail(email, otp);
    
    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.EMAIL_VERIFIED);
  });

  /**
   * Resend email verification OTP
   */
  resendVerificationOtp = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    await this.service.resendVerificationOtp(email);
    
    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.EMAIL_VERIFICATION_SENT);
  });

  /**
   * Request password reset
   */
  forgotPassword = this.asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    await this.service.forgotPassword(email);
    
    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.PASSWORD_RESET_SENT);
  });

  /**
   * Reset password with OTP
   */
  resetPassword = this.asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    
    await this.service.resetPassword(email, otp, newPassword);
    
    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.PASSWORD_RESET_SUCCESS);
  });

  /**
   * Change password (authenticated)
   */
  changePassword = this.asyncHandler(async (req, res) => {
    const { oldPassword, currentPassword, newPassword } = req.body;
    const effectiveOldPassword = oldPassword || currentPassword;
    const user = this.extractUser(req);
    
    await this.service.changePassword(user.id, effectiveOldPassword, newPassword);
    
    return this.handleSuccess(res, null, AUTH_CONSTANTS.MESSAGES.PASSWORD_CHANGED);
  });

  /**
   * Get current user profile
   */
  getMe = this.asyncHandler(async (req, res) => {
    const user = this.extractUser(req);
    const profile = await this.service.getProfile(user.id);
    
    return this.handleSuccess(res, profile, 'Profile retrieved successfully');
  });

  /**
   * Update current user profile
   */
  updateProfile = this.asyncHandler(async (req, res) => {
    const user = this.extractUser(req);
    const { firstName, lastName, phoneNumber, avatarUrl } = req.body;
    
    const updated = await this.service.updateProfile(user.id, {
      firstName,
      lastName,
      phoneNumber,
      avatarUrl,
    });
    
    return this.handleSuccess(res, updated, 'Profile updated successfully');
  });

  /**
   * Upload user avatar to Cloudinary
   */
  uploadAvatar = this.asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('No image file uploaded');
    }
    const avatarUrl = req.file.secure_url || req.file.path;
    return this.handleSuccess(res, { avatarUrl }, 'Avatar uploaded successfully', 201);
  });

  /**
   * Get user sessions
   */
  getSessions = this.asyncHandler(async (req, res) => {
    const user = this.extractUser(req);
    const sessions = await this.service.getUserSessions(user.id);
    
    return this.handleSuccess(res, sessions, 'Sessions retrieved successfully');
  });

  /**
   * Terminate specific session
   */
  terminateSession = this.asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const user = this.extractUser(req);
    const requestMeta = this.extractRequestMeta(req);
    
    await this.service.terminateSession(sessionId, user.id, requestMeta);
    
    return this.handleSuccess(res, null, 'Session terminated successfully');
  });

  /**
   * Terminate all sessions except current
   */
  terminateAllSessions = this.asyncHandler(async (req, res) => {
    const user = this.extractUser(req);
    const currentSessionId = req.sessionId; // Added by auth middleware
    const requestMeta = this.extractRequestMeta(req);
    
    await this.service.terminateAllSessions(user.id, currentSessionId, requestMeta);
    
    return this.handleSuccess(res, null, 'All sessions terminated successfully');
  });

  // Helper methods
  extractRequestMeta(req) {
    return {
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  setRefreshTokenCookie(res, refreshToken) {
    res.cookie(AUTH_CONSTANTS.COOKIES.REFRESH_TOKEN, refreshToken, AUTH_CONSTANTS.COOKIES.OPTIONS);
  }

  clearRefreshTokenCookie(res) {
    res.clearCookie(AUTH_CONSTANTS.COOKIES.REFRESH_TOKEN, {
      path: '/',
      httpOnly: true,
    });
  }
}