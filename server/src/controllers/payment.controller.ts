import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { createOrder, verifyPayment, handleWebhook, calculateDiscount, getRazorpayConfig } from '../services/payment.service';

export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { packageId, couponCode } = req.body;
    if (!packageId) throw new AppError('Package ID is required', 400);

    const orderData = await createOrder(req.user!.id, packageId, couponCode);
    sendSuccess(res, orderData, 'Payment order created');
  } catch (error) {
    next(error);
  }
};

export const verifyPaymentSignature = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId) throw new AppError('Order ID is required', 400);

    await verifyPayment(req.user!.id, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    sendSuccess(res, null, 'Payment verified successfully and subscription activated');
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, packageId } = req.body;
    if (!code || !packageId) throw new AppError('Coupon code and packageId are required', 400);

    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new AppError('Package not found', 404);

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    if (!coupon) throw new AppError('Invalid or expired coupon', 400);
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400);
    }
    if (pkg.price < coupon.minOrderAmount) {
      throw new AppError(`Minimum package price required is ₹${coupon.minOrderAmount}`, 400);
    }
    if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== pkg.type) {
      throw new AppError(`This coupon is only valid for ${coupon.applicableTo} packages`, 400);
    }

    const discount = calculateDiscount(coupon, pkg.price);
    const finalAmount = Math.max(0, pkg.price - discount);

    sendSuccess(res, {
      code: coupon.code,
      discountAmount: discount,
      finalAmount,
      originalPrice: pkg.price,
    }, 'Coupon applied successfully');
  } catch (error) {
    next(error);
  }
};

export const paymentWebhook = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    await handleWebhook(req.body, signature || '');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

export const getPublicPaymentConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await getRazorpayConfig();
    sendSuccess(res, {
      keyId: config.keyId || '',
      mode: config.mode,
      isEnabled: config.isEnabled,
      autoCapture: config.autoCapture,
    }, 'Public payment configuration');
  } catch (error) {
    next(error);
  }
};
