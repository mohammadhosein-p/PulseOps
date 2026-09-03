import React, { useState } from "react";
import { mockOrders } from "../mockData";
import type { Order } from "../types";
import { Timeline } from "../components/Timeline";
import {
    GitCommit,
    Clock,
    Package,
    Mail,
    Calendar,
    DollarSign,
} from "lucide-react";

export const OrdersPipelinePage: React.FC = () => {
    const [orders] = useState<Order[]>(mockOrders);
    const [selectedOrder, setSelectedOrder] = useState<Order>(orders[0]);
    const [filterStatus, setFilterStatus] = useState<string>("ALL");

    const filteredOrders = orders.filter((order) => {
        if (filterStatus === "ALL") return true;
        return order.status === filterStatus;
    });

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
                        failure points in real time
                    </p>
                </div>

                {/* فیلتر سفارش‌ها */}
                <div className="flex items-center gap-2">
                    {["ALL", "COMPLETED", "PENDING", "INVENTORY_FAILED"].map(
                        (st) => (
                            <button
                                key={st}
                                onClick={() => setFilterStatus(st)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                                    filterStatus === st
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                }`}
                            >
                                {st}
                            </button>
                        ),
                    )}
                </div>
            </div>

            {/* چیدمان دو ستونه تمام‌صفحه */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ستون فهرست سفارش‌ها */}
                <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 max-h-[800px] overflow-y-auto">
                    <span className="text-xs font-mono text-slate-400 px-2 block">
                        Select Order to Inspect ({filteredOrders.length}{" "}
                        entries)
                    </span>

                    <div className="space-y-2">
                        {filteredOrders.map((order) => {
                            const isSelected = selectedOrder.id === order.id;
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
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

                {/* ستون جزئیات و تایم‌لاین سفارش انتخاب‌شده */}
                <div className="lg:col-span-7 space-y-6">
                    {/* کارت خلاصه سفارش انتخابی */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <span className="text-xs font-mono text-slate-400">
                                    Order Unique ID
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

                        {/* متادیتا */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                    <Mail className="h-3.5 w-3.5" /> Customer
                                    Email
                                </span>
                                <span className="text-slate-200 break-all">
                                    {selectedOrder.customerEmail}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                    <DollarSign className="h-3.5 w-3.5" /> Total
                                    Captured
                                </span>
                                <span className="text-emerald-400 font-bold text-sm">
                                    ${selectedOrder.totalAmount}
                                </span>
                            </div>
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                <span className="text-slate-500 flex items-center gap-1.5 mb-1">
                                    <Calendar className="h-3.5 w-3.5" /> Created
                                    At
                                </span>
                                <span className="text-slate-200">
                                    {new Date(
                                        selectedOrder.createdAt,
                                    ).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>

                        {/* اقلام خریداری‌شده */}
                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                <Package className="h-4 w-4 text-indigo-400" />{" "}
                                Order Items Specification
                            </span>
                            <div className="space-y-1.5">
                                {selectedOrder.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs font-mono"
                                    >
                                        <span className="text-slate-300">
                                            {item.product?.name ||
                                                `Product ID: ${item.productId}`}
                                        </span>
                                        <span className="text-slate-400">
                                            {item.quantity} x ${item.price} ={" "}
                                            <strong className="text-slate-200">
                                                ${item.quantity * item.price}
                                            </strong>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* کامپوننت بازرس تایم‌لاین رویدادها */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Clock className="h-4 w-4 text-indigo-400" />{" "}
                                Kafka Choreography Trace Events
                            </h3>
                            <span className="text-xs font-mono text-slate-500">
                                {selectedOrder.events.length} State Changes
                                Captured
                            </span>
                        </div>

                        <Timeline events={selectedOrder.events} />
                    </div>
                </div>
            </div>
        </div>
    );
};
