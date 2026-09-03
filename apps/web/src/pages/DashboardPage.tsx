import React, { useState, useEffect, useCallback } from "react";
import { StatsOverview } from "../components/StatsOverview";
import { api } from "../lib/api";
import type { DashboardStats, WorkerTelemetry } from "../types";
import {
    Server,
    Database,
    Radio,
    CheckCircle,
    Cpu,
    HardDrive,
    RefreshCw,
    AlertCircle,
} from "lucide-react";

interface ReadinessStatus {
    status: string;
    database: string;
    redis: string;
    timestamp?: string;
    error?: string;
}

export const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        failedOrders: 0,
        totalRevenue: 0,
    });
    const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [workers, setWorkers] = useState<WorkerTelemetry[]>([]);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, readyData, workersData] = await Promise.all([
                api.getDashboardStats(),
                api.getReadiness().catch((err) => ({
                    status: "not_ready",
                    database: "disconnected",
                    redis: "disconnected",
                    error: err.message,
                })),
                api.getWorkersStatus().catch(() => []),
            ]);
            setStats(statsData);
            setReadiness(readyData);
            setWorkers(workersData);
        } catch (error) {
            console.error("Failed to load dashboard telemetry:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);


    return (
        <div className="w-full space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-indigo-400" />
                        SRE Telemetry & Cluster Health
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Aggregated system metrics from PostgreSQL OLTP and
                        infrastructure probes
                    </p>
                </div>

                <button
                    onClick={loadDashboardData}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer text-xs font-mono w-fit"
                >
                    <RefreshCw
                        className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
                    />
                    <span>Refresh Telemetry</span>
                </button>
            </div>

            <StatsOverview stats={stats} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-indigo-400" />
                                Kafka Event Stream Consumers
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Consumer groups orchestrating the asynchronous
                                order saga
                            </p>
                        </div>
                        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                            Choreography Mesh
                        </span>
                    </div>

                    <div className="space-y-3">
                        {workers.map((w) => {
                            const isAlive = w.status === "UP";
                            return (
                                <div
                                    key={w.id}
                                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${
                                        isAlive
                                            ? "bg-slate-950/60 border-slate-800/80"
                                            : "bg-rose-950/20 border-rose-900/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                                                isAlive
                                                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            }`}
                                        >
                                            <Server className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-200">
                                                {w.name}
                                            </h4>
                                            <span className="text-xs font-mono text-slate-500">
                                                Group ID: {w.group}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">
                                                Mesh:
                                            </span>
                                            <span className="text-indigo-400">
                                                {w.topicIn}
                                            </span>
                                            <span className="text-slate-600">
                                                →
                                            </span>
                                            <span className="text-cyan-400">
                                                {w.topicOut}
                                            </span>
                                        </div>

                                        <div
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${
                                                isAlive
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                            }`}
                                        >
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    isAlive
                                                        ? "bg-emerald-400 animate-pulse"
                                                        : "bg-rose-500"
                                                }`}
                                            />
                                            <span>
                                                {isAlive
                                                    ? "Active (Heartbeat OK)"
                                                    : "Offline (No Signal)"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="xl:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="pb-3 border-b border-slate-800">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-cyan-400" />
                            Core Infrastructure Probes
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Live status from Express /ready endpoint
                        </p>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Database className="h-4 w-4 text-cyan-400" />
                                <span className="text-slate-300">
                                    PostgreSQL OLTP
                                </span>
                            </div>
                            {readiness?.database === "connected" ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" />{" "}
                                    Connected
                                </span>
                            ) : (
                                <span className="text-rose-400 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                                    Disconnected
                                </span>
                            )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Server className="h-4 w-4 text-amber-400" />
                                <span className="text-slate-300">
                                    Redis Cache & Rate Limit
                                </span>
                            </div>
                            {readiness?.redis === "connected" ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle className="h-3.5 w-3.5" /> PONG
                                </span>
                            ) : (
                                <span className="text-rose-400 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />{" "}
                                    Unreachable
                                </span>
                            )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Radio className="h-4 w-4 text-indigo-400" />
                                <span className="text-slate-300">
                                    Apache Kafka Producer
                                </span>
                            </div>
                            <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Ready
                            </span>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-slate-400">
                        Probe timestamp:{" "}
                        <span className="font-mono text-slate-200">
                            {readiness?.timestamp
                                ? new Date(
                                      readiness.timestamp,
                                  ).toLocaleTimeString()
                                : "Awaiting sync..."}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
