import type { Order, Product, DashboardStats } from "./types.ts";

export const mockStats: DashboardStats = {
    totalOrders: 28,
    completedOrders: 24,
    pendingOrders: 2,
    failedOrders: 2,
    totalRevenue: 3420,
};

export const mockProducts: Product[] = [
    {
        id: "prod-1",
        name: "Cloud Native Microservices Book",
        price: 45,
        stock: 12,
    },
    {
        id: "prod-2",
        name: "PulseOps SRE Mechanical Keyboard",
        price: 120,
        stock: 4,
    },
    {
        id: "prod-3",
        name: "Distributed Systems Hoodie (L)",
        price: 75,
        stock: 0,
    },
];

export const mockOrders: Order[] = [
    {
        id: "ff16ff81-f801-4c11-9568-45edffd60606",
        customerEmail: "devops-lead@pulseops.io",
        totalAmount: 165,
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        items: [
            {
                productId: "prod-1",
                quantity: 1,
                price: 45,
                product: mockProducts[0],
            },
            {
                productId: "prod-2",
                quantity: 1,
                price: 120,
                product: mockProducts[1],
            },
        ],
        events: [
            {
                id: "ev-1",
                orderId: "ff16ff81",
                status: "PENDING",
                message: "Order created. Event queued for Payment Worker.",
                createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            },
            {
                id: "ev-2",
                orderId: "ff16ff81",
                status: "PAYMENT_COMPLETED",
                message:
                    "Payment of $165 processed successfully via Stripe gateway.",
                createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
            },
            {
                id: "ev-3",
                orderId: "ff16ff81",
                status: "INVENTORY_ALLOCATED",
                message: "Inventory items successfully reserved atomically.",
                createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            },
            {
                id: "ev-4",
                orderId: "ff16ff81",
                status: "COMPLETED",
                message:
                    "Confirmation email and invoice delivered to customer.",
                createdAt: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
            },
        ],
    },
    {
        id: "a7b8c9d0-1234-4567-89ab-cdef01234567",
        customerEmail: "chaos-tester@pulseops.io",
        totalAmount: 75,
        status: "INVENTORY_FAILED",
        createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        items: [
            {
                productId: "prod-3",
                quantity: 1,
                price: 75,
                product: mockProducts[2],
            },
        ],
        events: [
            {
                id: "ev-5",
                orderId: "a7b8c9d0",
                status: "PENDING",
                message: "Order created. Event queued for Payment Worker.",
                createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            },
            {
                id: "ev-6",
                orderId: "a7b8c9d0",
                status: "PAYMENT_COMPLETED",
                message: "Payment of $75 captured.",
                createdAt: new Date(Date.now() - 1000 * 60 * 2.5).toISOString(),
            },
            {
                id: "ev-7",
                orderId: "a7b8c9d0",
                status: "INVENTORY_FAILED",
                message:
                    "Inventory allocation failed: Insufficient stock for product ID prod-3.",
                createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
            },
        ],
    },
];
