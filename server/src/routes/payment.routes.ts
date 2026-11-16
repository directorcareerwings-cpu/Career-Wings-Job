import { Router } from 'express';
import { createPaymentOrder, verifyPaymentSignature, validateCoupon, paymentWebhook, getPublicPaymentConfig } from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/config', getPublicPaymentConfig);
router.post('/create-order', authenticateToken, createPaymentOrder);
router.post('/verify', authenticateToken, verifyPaymentSignature);
router.post('/validate-coupon', authenticateToken, validateCoupon);
router.post('/webhook', paymentWebhook);

export default router;
