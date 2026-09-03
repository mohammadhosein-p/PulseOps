import axios from "axios";
import type { Product, Order, DashboardStats, WorkerTelemetry } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 5000,
});

export interface CreateOrderPayload {
    customerEmail: string;
    items: {
        productId: string;
        quantity: number;
    }[];
}

export const api = {
    getProducts: async (): Promise<Product[]> => {
        const response = await apiClient.get<Product[]>("/api/products");
        return response.data;
    },

    createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
        const response = await apiClient.post<Order>("/api/orders", payload);
        return response.data;
    },

    getOrders: async (status?: string): Promise<Order[]> => {
        const response = await apiClient.get<Order[]>("/api/orders", {
            params: status && status !== "ALL" ? { status } : undefined,
        });
        return response.data;
    },

    getOrderById: async (id: string): Promise<Order> => {
        const response = await apiClient.get<Order>(`/api/orders/${id}`);
        return response.data;
    },

    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await apiClient.get<DashboardStats>(
            "/api/dashboard/stats",
        );
        return response.data;
    },

    getReadiness: async () => {
        const response = await apiClient.get("/ready");
        return response.data;
    },

    getWorkersStatus: async (): Promise<WorkerTelemetry[]> => {
        const response = await apiClient.get<WorkerTelemetry[]>(
            "/api/workers/status",
        );
        return response.data;
    },
};
