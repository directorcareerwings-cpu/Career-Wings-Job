"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
router.post('/register', (0, validate_1.validate)(auth_controller_1.registerValidation), auth_controller_1.register);
router.post('/login', (0, validate_1.validate)(auth_controller_1.loginValidation), auth_controller_1.login);
router.post('/refresh', auth_controller_1.refreshToken);
router.post('/refresh-token', auth_controller_1.refreshToken);
router.post('/logout', auth_controller_1.logout);
router.get('/me', auth_1.authenticateToken, auth_controller_1.getMe);
// OTP Verification & Resend
router.post('/verify-otp', [(0, express_validator_1.body)('email').isEmail().normalizeEmail(), (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }).isNumeric()], (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail(), (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 })]), auth_controller_1.verifyEmailOtp);
router.post('/resend-otp', [(0, express_validator_1.body)('email').isEmail().normalizeEmail()], (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail()]), auth_controller_1.resendEmailOtp);
// Password Reset via OTP
router.post('/forgot-password', [(0, express_validator_1.body)('email').isEmail().normalizeEmail()], (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail()]), auth_controller_1.forgotPassword);
router.post('/verify-reset-otp', [(0, express_validator_1.body)('email').isEmail().normalizeEmail(), (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }).isNumeric()], (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail(), (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 })]), auth_controller_1.verifyPasswordResetOtp);
router.post('/reset-password-otp', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
], (0, validate_1.validate)([(0, express_validator_1.body)('email').isEmail(), (0, express_validator_1.body)('otp').isLength({ min: 6, max: 6 }), (0, express_validator_1.body)('password').isLength({ min: 8 })]), auth_controller_1.resetPasswordWithOtp);
// Legacy token-based reset password
router.post('/reset-password', [
    (0, express_validator_1.body)('token').notEmpty(),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
], (0, validate_1.validate)([(0, express_validator_1.body)('token').notEmpty(), (0, express_validator_1.body)('password').isLength({ min: 8 })]), auth_controller_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map