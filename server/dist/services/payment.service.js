"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.verifyPayment = exports.createOrder = exports.calculateDiscount = exports.generateInvoiceNumber = exports.saveRazorpayConfig = exports.testRazorpayConnection = exports.getRazorpayClient = exports.getRazorpayConfig = exports.clearRazorpayConfigCache = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const errors_1 = require("../lib/errors");
const subscription_service_1 = require("./subscription.service");
const email_service_1 = require("./email.service");
let cachedConfig = null;
let cachedRazorpayClient = null;
const clearRazorpayConfigCache = () => {
    cachedConfig = null;
    cachedRazorpayClient = null;
};
exports.clearRazorpayConfigCache = clearRazorpayConfigCache;
const getRazorpayConfig = async () => {
    if (cachedConfig !== null)
        return cachedConfig;
    try {
        const settings = await prisma_1.prisma.adminSetting.findMany({
            where: {
                key: {
                    in: [
                        'RAZORPAY_KEY_ID',
                        'RAZORPAY_KEY_SECRET',
                        'RAZORPAY_WEBHOOK_SECRET',
                        'RAZORPAY_MODE',
                        'RAZORPAY_IS_ENABLED',
                        'RAZORPAY_AUTO_CAPTURE',
                    ],
                },
            },
        });
        const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
        const keyId = settingsMap.get('RAZORPAY_KEY_ID') || process.env.RAZORPAY_KEY_ID || '';
        const keySecret = settingsMap.get('RAZORPAY_KEY_SECRET') || process.env.RAZORPAY_KEY_SECRET || '';
        const webhookSecret = settingsMap.get('RAZORPAY_WEBHOOK_SECRET') || process.env.RAZORPAY_WEBHOOK_SECRET || '';
        const mode = settingsMap.get('RAZORPAY_MODE') || (keyId.startsWith('rzp_live') ? 'LIVE' : 'TEST');
        const isEnabled = settingsMap.get('RAZORPAY_IS_ENABLED') !== 'false';
        const autoCapture = settingsMap.get('RAZORPAY_AUTO_CAPTURE') !== 'false';
        const config = {
            keyId,
            keySecret,
            webhookSecret,
            mode,
            isEnabled,
            autoCapture,
        };
        cachedConfig = config;
        return config;
    }
    catch (err) {
        console.error('Error reading Razorpay config from DB, falling back to process.env:', err);
        const fallbackConfig = {
            keyId: process.env.RAZORPAY_KEY_ID || '',
            keySecret: process.env.RAZORPAY_KEY_SECRET || '',
            webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
            mode: 'TEST',
            isEnabled: true,
            autoCapture: true,
        };
        cachedConfig = fallbackConfig;
        return fallbackConfig;
    }
};
exports.getRazorpayConfig = getRazorpayConfig;
const getRazorpayClient = async () => {
    if (cachedRazorpayClient)
        return cachedRazorpayClient;
    const config = await (0, exports.getRazorpayConfig)();
    if (config.keyId && config.keyId !== 'rzp_test_your_key_id' && config.keySecret) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Razorpay = require('razorpay');
            cachedRazorpayClient = new Razorpay({
                key_id: config.keyId,
                key_secret: config.keySecret,
            });
            return cachedRazorpayClient;
        }
        catch (e) {
            console.warn('[PAYMENT] Razorpay client initialization error:', e);
            return null;
        }
    }
    return null;
};
exports.getRazorpayClient = getRazorpayClient;
const testRazorpayConnection = async (testKeyId, testKeySecret) => {
    const config = await (0, exports.getRazorpayConfig)();
    const keyId = (testKeyId || config.keyId || '').trim();
    const keySecret = (testKeySecret || config.keySecret || '').trim();
    if (!keyId || !keySecret) {
        return {
            success: false,
            message: 'Razorpay Key ID and Key Secret are both required to test connection.',
        };
    }
    if (keyId === 'rzp_test_your_key_id' || keySecret === 'your_key_secret') {
        return {
            success: false,
            message: 'Please provide valid Razorpay API keys from dashboard.razorpay.com.',
        };
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Razorpay = require('razorpay');
        const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const response = await client.orders.all({ count: 1 });
        return {
            success: true,
            message: `Successfully connected to Razorpay API (${keyId.startsWith('rzp_live') ? 'Live Mode' : 'Test Mode'}).`,
            details: {
                mode: keyId.startsWith('rzp_live') ? 'LIVE' : 'TEST',
                ordersAccessible: Array.isArray(response?.items),
            },
        };
    }
    catch (err) {
        const errMsg = err?.error?.description || err?.message || 'Failed to authenticate with Razorpay API';
        return {
            success: false,
            message: `Razorpay connection failed: ${errMsg}`,
        };
    }
};
exports.testRazorpayConnection = testRazorpayConnection;
const saveRazorpayConfig = async (data) => {
    const updates = [];
    if (data.keyId !== undefined) {
        updates.push({
            key: 'RAZORPAY_KEY_ID',
            value: data.keyId.trim(),
            group: 'PAYMENT',
            label: 'Razorpay Key ID',
        });
    }
    if (data.keySecret !== undefined && data.keySecret.trim() !== '') {
        updates.push({
            key: 'RAZORPAY_KEY_SECRET',
            value: data.keySecret.trim(),
            group: 'PAYMENT',
            label: 'Razorpay Key Secret',
        });
    }
    if (data.webhookSecret !== undefined) {
        updates.push({
            key: 'RAZORPAY_WEBHOOK_SECRET',
            value: data.webhookSecret.trim(),
            group: 'PAYMENT',
            label: 'Razorpay Webhook Secret',
        });
    }
    if (data.mode !== undefined) {
        updates.push({
            key: 'RAZORPAY_MODE',
            value: data.mode,
            group: 'PAYMENT',
            label: 'Razorpay Environment Mode',
        });
    }
    if (data.isEnabled !== undefined) {
        updates.push({
            key: 'RAZORPAY_IS_ENABLED',
            value: String(data.isEnabled),
            group: 'PAYMENT',
            label: 'Razorpay Gateway Status',
        });
    }
    if (data.autoCapture !== undefined) {
        updates.push({
            key: 'RAZORPAY_AUTO_CAPTURE',
            value: String(data.autoCapture),
            group: 'PAYMENT',
            label: 'Razorpay Auto Capture',
        });
    }
    for (const item of updates) {
        await prisma_1.prisma.adminSetting.upsert({
            where: { key: item.key },
            update: { value: item.value },
            create: item,
        });
    }
    (0, exports.clearRazorpayConfigCache)();
    return (0, exports.getRazorpayConfig)();
};
exports.saveRazorpayConfig = saveRazorpayConfig;
const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `CW-INV-${year}${month}-${random}`;
};
exports.generateInvoiceNumber = generateInvoiceNumber;
const calculateDiscount = (coupon, amount) => {
    if (coupon.discountType === 'PERCENTAGE') {
        const discount = (amount * coupon.discountValue) / 100;
        return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
    }
    return Math.min(coupon.discountValue, amount);
};
exports.calculateDiscount = calculateDiscount;
const createOrder = async (userId, packageId, couponCode) => {
    const config = await (0, exports.getRazorpayConfig)();
    if (!config.isEnabled) {
        throw new errors_1.AppError('Payment gateway is currently disabled by administrator. Please contact support.', 503);
    }
    const pkg = await prisma_1.prisma.package.findUnique({ where: { id: packageId, isActive: true } });
    if (!pkg)
        throw new errors_1.AppError('Package not found or inactive', 404);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role !== 'ADMIN' && user.role !== pkg.type) {
        throw new errors_1.AppError(`This package is for ${pkg.type.toLowerCase()} accounts only`, 403);
    }
    let amount = pkg.price;
    let discountAmount = 0;
    let couponId;
    // Apply coupon if provided
    if (couponCode) {
        const coupon = await prisma_1.prisma.coupon.findFirst({
            where: {
                code: couponCode.toUpperCase(),
                isActive: true,
                AND: [
                    { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
                    { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
                ],
            },
        });
        if (!coupon)
            throw new errors_1.AppError('Invalid or expired coupon code', 400);
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            throw new errors_1.AppError('Coupon usage limit reached', 400);
        }
        if (amount < coupon.minOrderAmount) {
            throw new errors_1.AppError(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`, 400);
        }
        if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== pkg.type) {
            throw new errors_1.AppError('This coupon is not applicable to this package', 400);
        }
        discountAmount = (0, exports.calculateDiscount)(coupon, amount);
        amount = Math.max(0, amount - discountAmount);
        couponId = coupon.id;
    }
    const amountInPaise = Math.round(amount * 100);
    const invoiceNumber = (0, exports.generateInvoiceNumber)();
    // For free packages (amount = 0), skip Razorpay
    if (amountInPaise === 0) {
        const payment = await prisma_1.prisma.payment.create({
            data: {
                userId,
                packageId,
                amount: pkg.price,
                currency: 'INR',
                status: 'SUCCESS',
                discountAmount,
                couponId: couponId || null,
                invoiceNumber,
            },
        });
        await (0, subscription_service_1.activateSubscription)(userId, packageId, payment.id);
        if (couponId) {
            await prisma_1.prisma.coupon.update({
                where: { id: couponId },
                data: { usageCount: { increment: 1 } },
            });
        }
        return {
            orderId: payment.id,
            amount: 0,
            currency: 'INR',
            packageName: pkg.name,
            discountAmount,
            couponId,
            keyId: config.keyId || '',
        };
    }
    const client = await (0, exports.getRazorpayClient)();
    if (!client) {
        // Simulate payment in dev mode
        console.log(`[PAYMENT DEV] Would create Razorpay order for ₹${amount}`);
        const payment = await prisma_1.prisma.payment.create({
            data: {
                userId,
                packageId,
                amount: pkg.price,
                currency: 'INR',
                status: 'PENDING',
                discountAmount,
                couponId: couponId || null,
                invoiceNumber,
                razorpayOrderId: `mock_order_${Date.now()}`,
            },
        });
        return {
            orderId: payment.razorpayOrderId,
            amount: amountInPaise,
            currency: 'INR',
            packageName: pkg.name,
            discountAmount,
            couponId,
            keyId: config.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
        };
    }
    const order = await client.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: invoiceNumber,
    });
    await prisma_1.prisma.payment.create({
        data: {
            userId,
            packageId,
            amount: pkg.price,
            currency: 'INR',
            status: 'PENDING',
            discountAmount,
            couponId: couponId || null,
            invoiceNumber,
            razorpayOrderId: order.id,
        },
    });
    return {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        packageName: pkg.name,
        discountAmount,
        couponId,
        keyId: config.keyId || process.env.RAZORPAY_KEY_ID || '',
    };
};
exports.createOrder = createOrder;
const verifyPayment = async (userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
    const config = await (0, exports.getRazorpayConfig)();
    const secret = config.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    const isDev = process.env.NODE_ENV === 'development' && razorpayOrderId.startsWith('mock_');
    if (!isDev && expectedSignature !== razorpaySignature) {
        throw new errors_1.AppError('Payment verification failed. Invalid signature.', 400);
    }
    const payment = await prisma_1.prisma.payment.findFirst({
        where: { razorpayOrderId, userId, status: 'PENDING' },
    });
    if (!payment)
        throw new errors_1.AppError('Payment record not found', 404);
    if (!payment.packageId)
        throw new errors_1.AppError('Package not associated with payment', 400);
    // Update payment
    await prisma_1.prisma.payment.update({
        where: { id: payment.id },
        data: {
            status: 'SUCCESS',
            razorpayPaymentId,
            razorpaySignature,
        },
    });
    // Activate subscription
    await (0, subscription_service_1.activateSubscription)(userId, payment.packageId, payment.id);
    // Send payment success confirmation email
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        include: { candidate: true, employer: true },
    });
    const pkg = await prisma_1.prisma.package.findUnique({ where: { id: payment.packageId } });
    if (user && pkg) {
        const name = user.candidate?.firstName || user.employer?.firstName || 'Valued Customer';
        (0, email_service_1.sendPaymentConfirmationEmail)(user.email, name, {
            transactionId: razorpayPaymentId || payment.id,
            orderId: razorpayOrderId,
            packageName: pkg.name,
            amount: payment.amount,
            paymentDate: new Date(),
            invoiceNumber: payment.invoiceNumber || undefined,
        }, user.id).catch(console.error);
    }
    // Update coupon usage
    if (payment.couponId) {
        await prisma_1.prisma.coupon.update({
            where: { id: payment.couponId },
            data: { usageCount: { increment: 1 } },
        });
    }
};
exports.verifyPayment = verifyPayment;
const handleWebhook = async (body, signature) => {
    const config = await (0, exports.getRazorpayConfig)();
    const secret = config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const bodyStr = JSON.stringify(body);
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(bodyStr)
        .digest('hex');
    if (expectedSignature !== signature) {
        throw new errors_1.AppError('Invalid webhook signature', 400);
    }
    const event = body.event;
    if (event === 'payment.captured') {
        const paymentData = body.payload
            .payment.entity;
        const payment = await prisma_1.prisma.payment.findFirst({
            where: { razorpayOrderId: paymentData.order_id },
            include: { package: true, user: { include: { candidate: true, employer: true } } },
        });
        if (payment && payment.status !== 'SUCCESS') {
            await prisma_1.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'SUCCESS', razorpayPaymentId: paymentData.id },
            });
            if (payment.packageId) {
                await (0, subscription_service_1.activateSubscription)(payment.userId, payment.packageId, payment.id);
            }
            if (payment.user && payment.package) {
                const name = payment.user.candidate?.firstName || payment.user.employer?.firstName || 'Customer';
                (0, email_service_1.sendPaymentConfirmationEmail)(payment.user.email, name, {
                    transactionId: paymentData.id,
                    orderId: paymentData.order_id,
                    packageName: payment.package.name,
                    amount: payment.amount,
                    paymentDate: new Date(),
                    invoiceNumber: payment.invoiceNumber || undefined,
                }, payment.userId).catch(console.error);
            }
        }
    }
    else if (event === 'payment.failed') {
        const paymentData = body.payload
            .payment.entity;
        const payment = await prisma_1.prisma.payment.findFirst({
            where: { razorpayOrderId: paymentData.order_id },
            include: { package: true, user: { include: { candidate: true, employer: true } } },
        });
        await prisma_1.prisma.payment.updateMany({
            where: { razorpayOrderId: paymentData.order_id },
            data: { status: 'FAILED', failureReason: paymentData.error_description },
        });
        if (payment?.user && payment?.package) {
            const name = payment.user.candidate?.firstName || payment.user.employer?.firstName || 'Customer';
            (0, email_service_1.sendPaymentFailedEmail)(payment.user.email, name, {
                packageName: payment.package.name,
                amount: payment.amount,
                reason: paymentData.error_description,
            }, payment.userId).catch(console.error);
        }
    }
};
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=payment.service.js.map