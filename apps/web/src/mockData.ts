import type { Order, Product, DashboardStats } from "./types";

export const mockStats: DashboardStats = {
    totalOrders: 142,
    completedOrders: 128,
    pendingOrders: 8,
    failedOrders: 6,
    totalRevenue: 28450,
};

export const mockProducts: Product[] = [
    {
        id: "e2a87a2d-1234-4b5a-90ab-c1d2e3f4a501",
        name: "SRE & Distributed Systems Handbook",
        description:
            "Comprehensive guide to building resilient, distributed systems using Kubernetes and Kafka.",
        price: 45,
        stock: 24,
        createdAt: "2026-08-15T10:00:00.000Z",
        updatedAt: "2026-08-15T10:00:00.000Z",
    },
    {
        id: "f3b98b3e-2345-4c6b-a1bc-d2e3f4a5b602",
        name: "PulseOps Production Mechanical Keyboard",
        description:
            "Tactile mechanical keyboard optimized for long debugging sessions. Cherry MX Brown switches.",
        price: 195,
        stock: 5,
        createdAt: "2026-08-20T11:30:00.000Z",
        updatedAt: "2026-08-20T11:30:00.000Z",
    },
    {
        id: "a4c09c4f-3456-4d7c-b2cd-e3f4a5b6c703",
        name: "Dedicated Kafka Node License",
        description:
            "Enterprise dedicated cluster node with low-latency partition rebalancing.",
        price: 320,
        stock: 2,
        createdAt: "2026-08-25T09:15:00.000Z",
        updatedAt: "2026-08-25T09:15:00.000Z",
    },
    {
        id: "b5d10d5a-4567-4e8d-c3de-f4a5b6c7d804",
        name: "Enterprise Observability Stack License",
        description:
            "Full-stack Prometheus, Grafana, and OpenTelemetry instrumentation toolkit.",
        price: 450,
        stock: 0, // اتمام موجودی برای تست شبیه‌سازی خطای INVENTORY_FAILED
        createdAt: "2026-08-28T14:20:00.000Z",
        updatedAt: "2026-08-28T14:20:00.000Z",
    },
];

export const mockOrders: Order[] = [
    {
        id: "ff16ff81-f801-4c11-9568-45edffd60606",
        customerEmail: "devops-lead@pulseops.io",
        totalAmount: 240,
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        items: [
            {
                id: "item-01",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                productId: mockProducts[0].id,
                quantity: 1,
                price: 45,
                product: mockProducts[0],
            },
            {
                id: "item-02",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                productId: mockProducts[1].id,
                quantity: 1,
                price: 195,
                product: mockProducts[1],
            },
        ],
        events: [
            {
                id: "ev-101",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                status: "PENDING",
                message: "Order created. Event queued for Payment Worker.",
                createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            },
            {
                id: "ev-102",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                status: "PAYMENT_COMPLETED",
                message: "Payment of $240 processed successfully.",
                createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
            },
            {
                id: "ev-103",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                status: "INVENTORY_ALLOCATED",
                message: "Inventory items successfully reserved atomically.",
                createdAt: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
            },
            {
                id: "ev-104",
                orderId: "ff16ff81-f801-4c11-9568-45edffd60606",
                status: "COMPLETED",
                message:
                    "Order completed successfully. Confirmation email sent to devops-lead@pulseops.io.",
                createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            },
        ],
    },
    {
        id: "9b112962-d006-4954-8735-6582175562f3",
        customerEmail: "sre-engineer@pulseops.io",
        totalAmount: 450,
        status: "INVENTORY_FAILED",
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
        items: [
            {
                id: "item-03",
                orderId: "9b112962-d006-4954-8735-6582175562f3",
                productId: mockProducts[3].id,
                quantity: 1,
                price: 450,
                product: mockProducts[3],
            },
        ],
        events: [
            {
                id: "ev-201",
                orderId: "9b112962-d006-4954-8735-6582175562f3",
                status: "PENDING",
                message: "Order created. Event queued for Payment Worker.",
                createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            },
            {
                id: "ev-202",
                orderId: "9b112962-d006-4954-8735-6582175562f3",
                status: "PAYMENT_COMPLETED",
                message: "Payment of $450 processed successfully.",
                createdAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
            },
            {
                id: "ev-203",
                orderId: "9b112962-d006-4954-8735-6582175562f3",
                status: "INVENTORY_FAILED",
                message:
                    "Insufficient stock for product ID: b5d10d5a-4567-4e8d-c3de-f4a5b6c7d804",
                createdAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
            },
        ],
    },
];
