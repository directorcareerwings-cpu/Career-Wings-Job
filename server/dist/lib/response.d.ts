import { Response } from 'express';
export declare const sendSuccess: (res: Response, data?: unknown, message?: string, statusCode?: number) => Response;
export declare const sendError: (res: Response, message?: string, statusCode?: number, errors?: unknown) => Response;
export declare const sendPaginated: (res: Response, data: unknown[], total: number, page: number, limit: number, message?: string) => Response;
//# sourceMappingURL=response.d.ts.map