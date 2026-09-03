import React from "react";
import type { DashboardStats } from "../types";
import {
    ShoppingBag,
    CheckCircle2,
    Clock,
    AlertTriangle,
    DollarSign,
} from "lucide-react";

interface StatsOverviewProps {
    stats: DashboardStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
    return (
        <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs text-slate-400 font-medium">
                        Total Orders
                    </span>
                    <div className="text-2xl font-bold mt-1 text-white font-mono">
                        {stats.totalOrders}
                    </div>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-lg text-slate-300">
                    <ShoppingBag className="h-5 w-5" />
                </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs text-emerald-400 font-medium">
                        Successful Pipeline
                    </span>
                    <div className="text-2xl font-bold mt-1 text-emerald-400 font-mono">
                        {stats.completedOrders}
                    </div>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs text-amber-400 font-medium">
                        In Processing
                    </span>
                    <div className="text-2xl font-bold mt-1 text-amber-400 font-mono">
                        {stats.pendingOrders}
                    </div>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                    <Clock className="h-5 w-5" />
                </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs text-rose-400 font-medium">
                        Pipeline Failures
                    </span>
                    <div className="text-2xl font-bold mt-1 text-rose-400 font-mono">
                        {stats.failedOrders}
                    </div>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <span className="text-xs text-indigo-400 font-medium">
                        Settled Revenue
                    </span>
                    <div className="text-2xl font-bold mt-1 text-indigo-300 font-mono">
                        ${stats.totalRevenue.toLocaleString()}
                    </div>
                </div>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                    <DollarSign className="h-5 w-5" />
                </div>
            </div>
        </section>
    );
};
