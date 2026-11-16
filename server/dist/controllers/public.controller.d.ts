import { Request, Response, NextFunction } from 'express';
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPublicPackages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getFeaturedJobs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCompanies: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTopCompanies: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCompanyBySlug: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCompanyJobs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCategories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCategoryBySlug: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getLocations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getLocationBySlug: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getSitemap: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getRobots: (req: Request, res: Response) => void;
//# sourceMappingURL=public.controller.d.ts.map