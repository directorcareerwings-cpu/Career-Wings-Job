"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/config', payment_controller_1.getPublicPaymentConfig);
router.post('/create-order', auth_1.authenticateToken, payment_controller_1.createPaymentOrder);
router.post('/verify', auth_1.authenticateToken, payment_controller_1.verifyPaymentSignature);
router.post('/validate-coupon', auth_1.authenticateToken, payment_controller_1.validateCoupon);
router.post('/webhook', payment_controller_1.paymentWebhook);
exports.default = router;
//# sourceMappingURL=payment.routes.js.map