export declare const generateInvoiceNumber: () => string;
export declare const calculateDiscount: (coupon: {
    discountType: string;
    discountValue: number;
    maxDiscount: number | null;
}, amount: number) => number;
export declare const createOrder: (userId: string, packageId: string, couponCode?: string) => Promise<{
    orderId: string;
    amount: number;
    currency: string;
    packageName: string;
    discountAmount: number;
    couponId?: string;
}>;
export declare const verifyPayment: (userId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) => Promise<void>;
export declare const handleWebhook: (body: Record<string, unknown>, signature: string) => Promise<void>;
//# sourceMappingURL=payment.service.d.ts.map