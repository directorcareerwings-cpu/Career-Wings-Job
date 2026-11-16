export declare const getActiveSubscription: (userId: string) => Promise<({
    package: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        type: string;
        description: string | null;
        price: number;
        durationDays: number;
        isActive: boolean;
        isFeatured: boolean;
        sortOrder: number;
        color: string | null;
        limits: string;
        features: string;
    };
} & {
    id: string;
    userId: string;
    packageId: string;
    limitsSnapshot: string;
    usageData: string;
    status: string;
    startDate: Date;
    endDate: Date;
    paymentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
export declare const checkLimit: (userId: string, featureKey: string) => Promise<{
    allowed: boolean;
    remaining: number | null;
    limit: number | null;
}>;
export declare const consumeCredit: (userId: string, featureKey: string, amount?: number) => Promise<void>;
export declare const activateSubscription: (userId: string, packageId: string, paymentId?: string) => Promise<void>;
export declare const expireSubscriptions: () => Promise<void>;
export declare const getFreePackage: (type?: string) => Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    price: number;
    durationDays: number;
    isActive: boolean;
    isFeatured: boolean;
    sortOrder: number;
    color: string | null;
    limits: string;
    features: string;
} | null>;
export declare const getSubscriptionSummary: (userId: string) => Promise<{
    hasSubscription: boolean;
    package: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        type: string;
        description: string | null;
        price: number;
        durationDays: number;
        isActive: boolean;
        isFeatured: boolean;
        sortOrder: number;
        color: string | null;
        limits: string;
        features: string;
    } | null;
    usage: {};
    limits: any;
    daysRemaining: null;
    endDate: null;
    subscriptionId?: undefined;
    startDate?: undefined;
} | {
    hasSubscription: boolean;
    subscriptionId: string;
    package: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        type: string;
        description: string | null;
        price: number;
        durationDays: number;
        isActive: boolean;
        isFeatured: boolean;
        sortOrder: number;
        color: string | null;
        limits: string;
        features: string;
    };
    usage: any;
    limits: any;
    daysRemaining: number;
    endDate: Date;
    startDate: Date;
}>;
//# sourceMappingURL=subscription.service.d.ts.map