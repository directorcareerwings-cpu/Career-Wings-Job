import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare const createPaymentOrder: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyPaymentSignature: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const validateCoupon: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const paymentWebhook: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map