export declare const createNotification: (userId: string, type: string, title: string, message: string, link?: string) => Promise<{
    link: string | null;
    id: string;
    userId: string;
    createdAt: Date;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    readAt: Date | null;
}>;
export declare const markAsRead: (notificationId: string, userId: string) => Promise<import("@prisma/client").Prisma.BatchPayload>;
export declare const markAllAsRead: (userId: string) => Promise<import("@prisma/client").Prisma.BatchPayload>;
export declare const getUnreadCount: (userId: string) => Promise<number>;
export declare const getUserNotifications: (userId: string, page: number, limit: number) => Promise<{
    notifications: {
        link: string | null;
        id: string;
        userId: string;
        createdAt: Date;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        readAt: Date | null;
    }[];
    total: number;
}>;
//# sourceMappingURL=notification.service.d.ts.map