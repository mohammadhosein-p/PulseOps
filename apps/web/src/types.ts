export type OrderStatus =
    | "PENDING"
    | "PAYMENT_PROCESSING"
    | "PAYMENT_COMPLETED"
    | "PAYMENT_FAILED"
    | "INVENTORY_ALLOCATED"
    | "INVENTORY_FAILED"
    | "COMPLETED"
    | "CANCELLED";

export interface OrderEvent {
    id: string;
    orderId: string;
    status: OrderStatus;
    message: string;
    createdAt: string;
}

export interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
}

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
    product?: Product;
}

export interface Order {
    id: string;
    customerEmail: string;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
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
