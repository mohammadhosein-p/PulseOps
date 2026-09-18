import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Product } from "../types";
import {
    ShoppingBag,
    Minus,
    Plus,
    Send,
    CheckCircle,
    Zap,
    AlertCircle,
    Loader2,
} from "lucide-react";

export const StorefrontPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [customerEmail, setCustomerEmail] = useState("lead.dev@pulseops.io");
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const fetchProducts = async () => {
        try {
            const data = await api.getProducts();
            setProducts(data);
        } catch (err: any) {
            setFeedback({
                type: "error",
                message:
                    "Could not connect to API Gateway. Ensure backend is running on port 4000.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleQtyChange = (id: string, delta: number, maxStock: number) => {
        const current = quantities[id] || 1;
        const next = Math.max(1, Math.min(maxStock, current + delta));
        setQuantities((prev) => ({ ...prev, [id]: next }));
    };

    const handleTriggerOrder = async (product: Product) => {
        const qty = quantities[product.id] || 1;
        setSubmittingId(product.id);
        setFeedback(null);

        try {
            const order = await api.createOrder({
                customerEmail,
                items: [{ productId: product.id, quantity: qty }],
            });

            setFeedback({
                type: "success",
                message: `Order #${order.id.slice(0, 8)} successfully dispatched into Kafka pipeline!`,
            });

            fetchProducts();
        } catch (err: any) {
            const errMessage =
                err.response?.data?.error ||
                "Failed to place order. Rate limit or server error.";
            setFeedback({ type: "error", message: errMessage });
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <div className="w-full space-y-8">
            {feedback && (
                <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                        feedback.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedback.type === "success" ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        <span>{feedback.message}</span>
                    </div>
                    <button
                        onClick={() => setFeedback(null)}
                        className="underline cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <section className="w-full rounded-2xl bg-linear-to-r from-indigo-950/40 via-slate-900 to-slate-900/60 border border-slate-800 p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md w-fit border border-indigo-500/20">
                        <Zap className="h-3.5 w-3.5" /> High-Throughput Event
                        Simulator
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        Enterprise Storefront
                    </h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Directly trigger transactional events across
                        micro-workers. Every order generates an atomic sequence:
                        PostgreSQL staging, Redis-backed rate limiting, and
                        asynchronous Kafka distribution.
                    </p>
                </div>

                <div className="flex flex-col gap-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800 w-full md:w-auto">
                    <span className="text-[11px] font-mono text-slate-400">
                        Target Email for Trace:
                    </span>
                    <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono w-full sm:w-64"
                    />
                </div>
            </section>

            <section className="w-full space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-indigo-400" />
                        Active Products in Inventory
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                        Postgres OLTP + Redis In-Memory Cache
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-16 text-slate-400 text-sm font-mono gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        Loading live catalog from database...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {(Array.isArray(products) ? products : [])?.map((product) => {
                            const qty = quantities[product.id] || 1;
                            const isOutOfStock = product.stock === 0;
                            const isSubmitting = submittingId === product.id;

                            return (
                                <div
                                    key={product.id}
                                    className={`flex flex-col justify-between rounded-2xl border transition-all duration-200 p-6 ${
                                        isOutOfStock
                                            ? "bg-slate-950/40 border-rose-950/40 opacity-75"
                                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-black/40"
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <h4 className="text-base font-semibold text-slate-100 leading-snug">
                                                {product.name}
                                            </h4>
                                            <span className="text-lg font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                                ${product.price}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-400 leading-relaxed min-h-12">
                                            {product.description ||
                                                "Enterprise grade infrastructure tooling component."}
                                        </p>

                                        <div className="text-[11px] font-mono text-slate-500 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 break-all">
                                            UUID: {product.id}
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">
                                                Stock Availability:
                                            </span>
                                            <span
                                                className={`font-mono font-bold ${
                                                    isOutOfStock
                                                        ? "text-rose-400 flex items-center gap-1"
                                                        : product.stock < 10
                                                          ? "text-amber-400"
                                                          : "text-slate-300"
                                                }`}
                                            >
                                                {isOutOfStock ? (
                                                    <>
                                                        <AlertCircle className="h-3.5 w-3.5" />{" "}
                                                        Out of Stock
                                                    </>
                                                ) : (
                                                    `${product.stock} units left`
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center border border-slate-800 rounded-xl bg-slate-950">
                                                <button
                                                    disabled={
                                                        isOutOfStock || qty <= 1
                                                    }
                                                    onClick={() =>
                                                        handleQtyChange(
                                                            product.id,
                                                            -1,
                                                            product.stock,
                                                        )
                                                    }
                                                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <span className="px-3 text-xs font-mono font-bold text-slate-200">
                                                    {qty}
                                                </span>
                                                <button
                                                    disabled={
                                                        isOutOfStock ||
                                                        qty >= product.stock
                                                    }
                                                    onClick={() =>
                                                        handleQtyChange(
                                                            product.id,
                                                            1,
                                                            product.stock,
                                                        )
                                                    }
                                                    className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>

                                            <button
                                                disabled={
                                                    isOutOfStock || isSubmitting
                                                }
                                                onClick={() =>
                                                    handleTriggerOrder(product)
                                                }
                                                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed ${
                                                    isSubmitting
                                                        ? "bg-indigo-700 text-slate-200"
                                                        : isOutOfStock
                                                          ? "bg-slate-800 text-slate-600"
                                                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                                }`}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                                                        Dispatching...
                                                    </>
                                                ) : isOutOfStock ? (
                                                    "Unavailable"
                                                ) : (
                                                    <>
                                                        <Send className="h-3.5 w-3.5" />{" "}
                                                        Place Order ($
                                                        {product.price * qty})
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};
