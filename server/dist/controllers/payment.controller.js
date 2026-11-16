"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicPaymentConfig = exports.paymentWebhook = exports.validateCoupon = exports.verifyPaymentSignature = exports.createPaymentOrder = void 0;
const response_1 = require("../lib/response");
const errors_1 = require("../lib/errors");
const prisma_1 = require("../lib/prisma");
const payment_service_1 = require("../services/payment.service");
const createPaymentOrder = async (req, res, next) => {
    try {
        const { packageId, couponCode } = req.body;
        if (!packageId)
            throw new errors_1.AppError('Package ID is required', 400);
        const orderData = await (0, payment_service_1.createOrder)(req.user.id, packageId, couponCode);
        (0, response_1.sendSuccess)(res, orderData, 'Payment order created');
    }
    catch (error) {
        next(error);
    }
};
exports.createPaymentOrder = createPaymentOrder;
const verifyPaymentSignature = async (req, res, next) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        if (!razorpayOrderId)
            throw new errors_1.AppError('Order ID is required', 400);
        await (0, payment_service_1.verifyPayment)(req.user.id, razorpayOrderId, razorpayPaymentId, razorpaySignature);
        (0, response_1.sendSuccess)(res, null, 'Payment verified successfully and subscription activated');
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPaymentSignature = verifyPaymentSignature;
const validateCoupon = async (req, res, next) => {
    try {
        const { code, packageId } = req.body;
        if (!code || !packageId)
            throw new errors_1.AppError('Coupon code and packageId are required', 400);
        const pkg = await prisma_1.prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg)
            throw new errors_1.AppError('Package not found', 404);
        const coupon = await prisma_1.prisma.coupon.findFirst({
            where: {
                code: code.toUpperCase(),
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
        });
        if (!coupon)
            throw new errors_1.AppError('Invalid or expired coupon', 400);
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new errors_1.AppError('Coupon usage limit reached', 400);
        }
        if (pkg.price < coupon.minOrderAmount) {
            throw new errors_1.AppError(`Minimum package price required is ₹${coupon.minOrderAmount}`, 400);
        }
        if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== pkg.type) {
            throw new errors_1.AppError(`This coupon is only valid for ${coupon.applicableTo} packages`, 400);
        }
        const discount = (0, payment_service_1.calculateDiscount)(coupon, pkg.price);
        const finalAmount = Math.max(0, pkg.price - discount);
        (0, response_1.sendSuccess)(res, {
            code: coupon.code,
            discountAmount: discount,
            finalAmount,
            originalPrice: pkg.price,
        }, 'Coupon applied successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.validateCoupon = validateCoupon;
const paymentWebhook = async (req, res, next) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        await (0, payment_service_1.handleWebhook)(req.body, signature || '');
        res.status(200).json({ status: 'ok' });
    }
    catch (error) {
        next(error);
    }
};
exports.paymentWebhook = paymentWebhook;
const getPublicPaymentConfig = async (req, res, next) => {
    try {
        const config = await (0, payment_service_1.getRazorpayConfig)();
        (0, response_1.sendSuccess)(res, {
            keyId: config.keyId || '',
            mode: config.mode,
            isEnabled: config.isEnabled,
            autoCapture: config.autoCapture,
        }, 'Public payment configuration');
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicPaymentConfig = getPublicPaymentConfig;
//# sourceMappingURL=payment.controller.js.map