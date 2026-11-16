"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserNotifications = exports.getUnreadCount = exports.markAllAsRead = exports.markAsRead = exports.createNotification = void 0;
const prisma_1 = require("../lib/prisma");
const createNotification = async (userId, type, title, message, link) => {
    return prisma_1.prisma.notification.create({
        data: { userId, type, title, message, link },
    });
};
exports.createNotification = createNotification;
const markAsRead = async (notificationId, userId) => {
    return prisma_1.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true, readAt: new Date() },
    });
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (userId) => {
    return prisma_1.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
};
exports.markAllAsRead = markAllAsRead;
const getUnreadCount = async (userId) => {
    return prisma_1.prisma.notification.count({
        where: { userId, isRead: false },
    });
};
exports.getUnreadCount = getUnreadCount;
const getUserNotifications = async (userId, page, limit) => {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        prisma_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma_1.prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total };
};
exports.getUserNotifications = getUserNotifications;
//# sourceMappingURL=notification.service.js.map