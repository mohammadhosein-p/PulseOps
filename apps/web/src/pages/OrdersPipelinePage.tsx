import React, { useState, useEffect, useCallback } from "react";
import type { Order } from "../types";
import { api } from "../lib/api";
import { Timeline } from "../components/Timeline";
import {
    GitCommit,
    Clock,
    Package,
    Mail,
    Calendar,
    DollarSign,
    RefreshCw,
    Inbox,
} from "lucide-react";

export const OrdersPipelinePage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

    const fetchOrders = useCallback(
        async (isSilent = false) => {
            if (!isSilent) setLoading(true);
            try {
                const data = await api.getOrders(filterStatus);
                setOrders(data);

                setSelectedOrder((prev) => {
                    if (!data.length) return null;
                    if (!prev) return data[0];
                    const exists = data.find((o) => o.id === prev.id);
                    return exists || data[0];
                });
            } catch (err) {
                console.error("Failed to fetch orders:", err);
            } finally {
                if (!isSilent) setLoading(false);
            }
        },
        [filterStatus],
    );

    const fetchOrderDetails = useCallback(async (orderId: string) => {
        setLoadingDetails(true);
        try {
            const data = await api.getOrderById(orderId);
            setSelectedOrder(data);
        } catch (err) {
            console.error("Failed to fetch order details:", err);
        } finally {
            setLoadingDetails(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        if (
            selectedOrder?.id &&
            (!selectedOrder.events || selectedOrder.events.length <= 1)
        ) {
            fetchOrderDetails(selectedOrder.id);
        }
    }, [selectedOrder?.id, fetchOrderDetails]);

    const handleManualRefresh = () => {
        fetchOrders();
        if (selectedOrder?.id) {
            fetchOrderDetails(selectedOrder.id);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "COMPLETED":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "INVENTORY_FAILED":
            case "PAYMENT_FAILED":
            case "CANCELLED":
                return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            default:
                return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <GitCommit className="h-5 w-5 text-indigo-400" />
                        Distributed Pipeline Inspector
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Trace events choreography, order transitions, and
                        failure points
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleManualRefresh}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer text-xs font-mono"
                        title="Manual Refresh"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
                        />
                        <span>Refresh</span>
                    </button>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        {[
                            "ALL",
                            "COMPLETED",
                            "PENDING",
                            "INVENTORY_FAILED",
                        ].map((st) => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                                    filterStatus === st
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading && orders.length === 0 ? (
                <div className="w-full h-72 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                    Connecting to Pipeline endpoints via Axios client...
                </div>
            ) : orders.length === 0 ? (
                <div className="w-full h-80 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 p-6 text-center">
                    <Inbox className="h-10 w-10 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-200">
                        No Orders Dispatched Yet
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                        The database currently has no records matching this
                        filter. Switch to the Storefront to create a new order.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 max-h-200 overflow-y-auto">
                        <span className="text-xs font-mono text-slate-400 px-2 block">
                            Active Traces ({orders.length} orders recorded)
                        </span>

                        <div className="space-y-2">
                            {orders.map((order) => {
                                const isSelected =
                                    selectedOrder?.id === order.id;
                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            fetchOrderDetails(order.id);
                                        }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                                            isSelected
                                                ? "bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                                                : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-bold text-slate-200">
                                                {order.id.slice(0, 18)}...
                                            </span>
                                            <span
                                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${getStatusStyle(
                                                    order.status,
                                                )}`}
                                            >
                                                {order.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                                            <span>{order.customerEmail}</span>
                                            <span className="text-slate-200 font-bold">
                                                ${order.totalAmount}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {selectedOrder && (
                        <div className="lg:col-span-7 space-y-6">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                                    <div>
                                        <span className="text-xs font-mono text-slate-400">
                                            Order Trace UUID
                                        </span>
                                        <h3 className="text-sm font-mono font-bold text-white break-all">
                                            {selectedOrder.id}
                                        </h3>
                                    </div>
                                    <span
                                        className={`text-xs font-mono px-3 py-1 rounded-lg border w-fit ${getStatusStyle(
                                            selectedOrder.status,
                                        )}`}
                                    >
                                        {selectedOrder.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                        <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                            <Mail className="h-3.5 w-3.5" />{" "}
                                            Customer Email
                                        </span>
                                        <span className="text-slate-200 break-all">
                                            {selectedOrder.customerEmail}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                        <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                            <DollarSign className="h-3.5 w-3.5" />{" "}
                                            Total Captured
                                        </span>
                                        <span className="text-emerald-400 font-bold text-sm">
                                            ${selectedOrder.totalAmount}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                        <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                            <Calendar className="h-3.5 w-3.5" />{" "}
                                            Created At
                                        </span>
                                        <span className="text-slate-200">
                                            {new Date(
                                                selectedOrder.createdAt,
                                            ).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                        <Package className="h-4 w-4 text-indigo-400" />{" "}
                                        Order Items Specification
                                    </span>
                                    <div className="space-y-1.5">
                                        {selectedOrder.items?.map(
                                            (item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs font-mono"
                                                >
                                                    <span className="text-slate-300">
                                                        {item.product?.name ||
                                                            `Product ID: ${item.productId}`}
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {item.quantity} x $
                                                        {item.price} ={" "}
                                                        <strong className="text-slate-200">
                                                            $
                                                            {item.quantity *
                                                                item.price}
                                                        </strong>
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-indigo-400" />{" "}
                                        Kafka Choreography Trace Events
                                    </h3>
                                    <span className="text-xs font-mono text-slate-500 flex items-center gap-2">
                                        {loadingDetails && (
                                            <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                                        )}
                                        {selectedOrder.events?.length || 0}{" "}
                                        State Changes Captured
                                    </span>
                                </div>

                                {selectedOrder.events &&
                                selectedOrder.events.length > 0 ? (
                                    <Timeline events={selectedOrder.events} />
                                ) : (
                                    <div className="p-4 text-center text-xs font-mono text-slate-500">
                                        No timeline events registered yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
