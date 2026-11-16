import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import {
  hasPackageFeature,
  hasPackageLimitRemaining,
} from '../services/subscription.service';

/**
 * Reusable middleware to verify that the user's active package includes a given feature toggle
 */
export const requireFeature = (featureKey: string, customMessage?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Admins bypass package checks
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const hasAccess = await hasPackageFeature(req.user.id, featureKey);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          code: 'FEATURE_NOT_INCLUDED',
          feature: featureKey,
          message:
            customMessage ||
            `This premium feature requires an upgraded package. Please upgrade your package to gain access.`,
          upgradeUrl: req.user.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Reusable middleware to verify that the user's active package has quota remaining for an action
 */
export const requireQuota = (featureKey: string, amount = 1, customMessage?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Admins bypass quota checks
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const check = await hasPackageLimitRemaining(req.user.id, featureKey, amount);
      if (!check.allowed) {
        res.status(403).json({
          success: false,
          code: 'QUOTA_EXHAUSTED',
          feature: featureKey,
          remaining: check.remaining,
          limit: check.limit,
          used: check.used,
          message:
            customMessage ||
            `You have used all available ${featureKey} in your current package (${check.used}/${check.limit}). Upgrade your package to continue.`,
          upgradeUrl: req.user.role === 'EMPLOYER' ? '/employer/subscription' : '/subscription',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export { hasPackageFeature, hasPackageLimitRemaining };
