export type OrderStatus =
    | "PENDING"
    | "PAYMENT_PROCESSING"
    | "PAYMENT_COMPLETED"
    | "PAYMENT_FAILED"
    | "INVENTORY_ALLOCATED"
    | "INVENTORY_FAILED"
    | "COMPLETED"
    | "CANCELLED";

export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    price: number;
    product?: Product;
}

export interface OrderEvent {
    id: string;
    orderId: string;
    status: OrderStatus;
    message: string;
    createdAt: string;
}

export interface Order {
    id: string;
    customerEmail: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
    items: OrderItem[];
    events: OrderEvent[];
}

export interface DashboardStats {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    failedOrders: number;
    totalRevenue: number;
}

export interface WorkerTelemetry {
    id: string;
    name: string;
    group: string;
    topicIn: string;
    topicOut: string;
    status: "UP" | "DOWN";
    lastSeen: string | null;
}