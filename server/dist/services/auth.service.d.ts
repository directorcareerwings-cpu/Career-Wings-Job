export declare const generateAccessToken: (userId: string, role: string, email: string) => string;
export declare const generateRefreshToken: (userId: string) => Promise<string>;
export declare const verifyAccessToken: (token: string) => {
    userId: string;
    role: string;
    email: string;
};
export declare const verifyRefreshToken: (token: string) => Promise<{
    userId: string;
}>;
export declare const revokeRefreshToken: (token: string) => Promise<void>;
export declare const revokeAllUserRefreshTokens: (userId: string) => Promise<void>;
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generatePasswordResetToken: (userId: string) => Promise<string>;
export declare const verifyPasswordResetToken: (token: string) => Promise<string>;
//# sourceMappingURL=auth.service.d.ts.map