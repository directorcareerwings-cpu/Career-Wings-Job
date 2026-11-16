import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { activateSubscription } from './subscription.service';
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail } from './email.service';

export interface RazorpayGatewayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: 'TEST' | 'LIVE';
  isEnabled: boolean;
  autoCapture: boolean;
}

let cachedConfig: RazorpayGatewayConfig | null = null;
let cachedRazorpayClient: any = null;

export const clearRazorpayConfigCache = (): void => {
  cachedConfig = null;
  cachedRazorpayClient = null;
};

export const getRazorpayConfig = async (): Promise<RazorpayGatewayConfig> => {
  if (cachedConfig) return cachedConfig;

  try {
    const settings = await prisma.adminSetting.findMany({
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
    const mode = (settingsMap.get('RAZORPAY_MODE') as 'TEST' | 'LIVE') || (keyId.startsWith('rzp_live') ? 'LIVE' : 'TEST');
    const isEnabled = settingsMap.get('RAZORPAY_IS_ENABLED') !== 'false';
    const autoCapture = settingsMap.get('RAZORPAY_AUTO_CAPTURE') !== 'false';

    cachedConfig = {
      keyId,
      keySecret,
      webhookSecret,
      mode,
      isEnabled,
      autoCapture,
    };
    return cachedConfig;
  } catch (err) {
    console.error('Error reading Razorpay config from DB, falling back to process.env:', err);
    return {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
      mode: 'TEST',
      isEnabled: true,
      autoCapture: true,
    };
  }
};

export const getRazorpayClient = async (): Promise<any> => {
  if (cachedRazorpayClient) return cachedRazorpayClient;
  const config = await getRazorpayConfig();

  if (config.keyId && config.keyId !== 'rzp_test_your_key_id' && config.keySecret) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Razorpay = require('razorpay');
      cachedRazorpayClient = new Razorpay({
        key_id: config.keyId,
        key_secret: config.keySecret,
      });
      return cachedRazorpayClient;
    } catch (e) {
      console.warn('[PAYMENT] Razorpay client initialization error:', e);
      return null;
    }
  }
  return null;
};

export const testRazorpayConnection = async (
  testKeyId?: string,
  testKeySecret?: string
): Promise<{ success: boolean; message: string; details?: any }> => {
  const config = await getRazorpayConfig();
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
  } catch (err: any) {
    const errMsg = err?.error?.description || err?.message || 'Failed to authenticate with Razorpay API';
    return {
      success: false,
      message: `Razorpay connection failed: ${errMsg}`,
    };
  }
};

export const saveRazorpayConfig = async (data: {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  mode?: 'TEST' | 'LIVE';
  isEnabled?: boolean;
  autoCapture?: boolean;
}): Promise<RazorpayGatewayConfig> => {
  const updates: { key: string; value: string; group: string; label: string }[] = [];

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
    await prisma.adminSetting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }

  clearRazorpayConfigCache();
  return getRazorpayConfig();
};

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `CW-INV-${year}${month}-${random}`;
};

export const calculateDiscount = (
  coupon: { discountType: string; discountValue: number; maxDiscount: number | null },
  amount: number
): number => {
  if (coupon.discountType === 'PERCENTAGE') {
    const discount = (amount * coupon.discountValue) / 100;
    return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
  }
  return Math.min(coupon.discountValue, amount);
};

export const createOrder = async (
  userId: string,
  packageId: string,
  couponCode?: string
): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  packageName: string;
  discountAmount: number;
  couponId?: string;
  keyId?: string;
}> => {
  const config = await getRazorpayConfig();
  if (!config.isEnabled) {
    throw new AppError('Payment gateway is currently disabled by administrator. Please contact support.', 503);
  }

  const pkg = await prisma.package.findUnique({ where: { id: packageId, isActive: true } });
  if (!pkg) throw new AppError('Package not found or inactive', 404);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.role !== 'ADMIN' && user.role !== pkg.type) {
    throw new AppError(`This package is for ${pkg.type.toLowerCase()} accounts only`, 403);
  }

  let amount = pkg.price;
  let discountAmount = 0;
  let couponId: string | undefined;

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: couponCode.toUpperCase(),
        isActive: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
        ],
      },
    });

    if (!coupon) throw new AppError('Invalid or expired coupon code', 400);
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400);
    }
    if (amount < coupon.minOrderAmount) {
      throw new AppError(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`, 400);
    }
    if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== pkg.type) {
      throw new AppError('This coupon is not applicable to this package', 400);
    }

    discountAmount = calculateDiscount(coupon, amount);
    amount = Math.max(0, amount - discountAmount);
    couponId = coupon.id;
  }

  const amountInPaise = Math.round(amount * 100);
  const invoiceNumber = generateInvoiceNumber();

  // For free packages (amount = 0), skip Razorpay
  if (amountInPaise === 0) {
    const payment = await prisma.payment.create({
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

    await activateSubscription(userId, packageId, payment.id);

    if (couponId) {
      await prisma.coupon.update({
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

  const client = await getRazorpayClient();

  if (!client) {
    // Simulate payment in dev mode
    console.log(`[PAYMENT DEV] Would create Razorpay order for ₹${amount}`);
    const payment = await prisma.payment.create({
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
      orderId: payment.razorpayOrderId!,
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

  await prisma.payment.create({
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

export const verifyPayment = async (
  userId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<void> => {
  const config = await getRazorpayConfig();
  const secret = config.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const isDev = process.env.NODE_ENV === 'development' && razorpayOrderId.startsWith('mock_');

  if (!isDev && expectedSignature !== razorpaySignature) {
    throw new AppError('Payment verification failed. Invalid signature.', 400);
  }

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId, userId, status: 'PENDING' },
  });

  if (!payment) throw new AppError('Payment record not found', 404);
  if (!payment.packageId) throw new AppError('Package not associated with payment', 400);

  // Update payment
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'SUCCESS',
      razorpayPaymentId,
      razorpaySignature,
    },
  });

  // Activate subscription
  await activateSubscription(userId, payment.packageId, payment.id);

  // Send payment success confirmation email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { candidate: true, employer: true },
  });
  const pkg = await prisma.package.findUnique({ where: { id: payment.packageId } });

  if (user && pkg) {
    const name = user.candidate?.firstName || user.employer?.firstName || 'Valued Customer';
    sendPaymentConfirmationEmail(
      user.email,
      name,
      {
        transactionId: razorpayPaymentId || payment.id,
        orderId: razorpayOrderId,
        packageName: pkg.name,
        amount: payment.amount,
        paymentDate: new Date(),
        invoiceNumber: payment.invoiceNumber || undefined,
      },
      user.id
    ).catch(console.error);
  }

  // Update coupon usage
  if (payment.couponId) {
    await prisma.coupon.update({
      where: { id: payment.couponId },
      data: { usageCount: { increment: 1 } },
    });
  }
};

export const handleWebhook = async (
  body: Record<string, unknown>,
  signature: string
): Promise<void> => {
  const config = await getRazorpayConfig();
  const secret = config.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const bodyStr = JSON.stringify(body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyStr)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new AppError('Invalid webhook signature', 400);
  }

  const event = body.event as string;

  if (event === 'payment.captured') {
    const paymentData = (body.payload as { payment: { entity: { order_id: string; id: string } } })
      .payment.entity;
    
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: paymentData.order_id },
      include: { package: true, user: { include: { candidate: true, employer: true } } },
    });

    if (payment && payment.status !== 'SUCCESS') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', razorpayPaymentId: paymentData.id },
      });

      if (payment.packageId) {
        await activateSubscription(payment.userId, payment.packageId, payment.id);
      }

      if (payment.user && payment.package) {
        const name = payment.user.candidate?.firstName || payment.user.employer?.firstName || 'Customer';
        sendPaymentConfirmationEmail(
          payment.user.email,
          name,
          {
            transactionId: paymentData.id,
            orderId: paymentData.order_id,
            packageName: payment.package.name,
            amount: payment.amount,
            paymentDate: new Date(),
            invoiceNumber: payment.invoiceNumber || undefined,
          },
          payment.userId
        ).catch(console.error);
      }
    }
  } else if (event === 'payment.failed') {
    const paymentData = (body.payload as { payment: { entity: { order_id: string; error_description: string } } })
      .payment.entity;

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: paymentData.order_id },
      include: { package: true, user: { include: { candidate: true, employer: true } } },
    });

    await prisma.payment.updateMany({
      where: { razorpayOrderId: paymentData.order_id },
      data: { status: 'FAILED', failureReason: paymentData.error_description },
    });

    if (payment?.user && payment?.package) {
      const name = payment.user.candidate?.firstName || payment.user.employer?.firstName || 'Customer';
      sendPaymentFailedEmail(
        payment.user.email,
        name,
        {
          packageName: payment.package.name,
          amount: payment.amount,
          reason: paymentData.error_description,
        },
        payment.userId
      ).catch(console.error);
    }
  }
};
