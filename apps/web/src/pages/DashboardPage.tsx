import React from "react";
import { StatsOverview } from "../components/StatsOverview";
import { mockStats } from "../mockData";
import {
    Server,
    Database,
    Radio,
    CheckCircle,
    Cpu,
    HardDrive,
    Zap,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
    const workers = [
        {
            name: "Payment Worker",
            group: "payment-service-group",
            topicIn: "order-created",
            status: "Healthy",
            ping: "12ms",
        },
        {
            name: "Inventory Worker",
            group: "inventory-service-group",
            topicIn: "payment-completed",
            status: "Healthy",
            ping: "15ms",
        },
        {
            name: "Notification Worker",
            group: "notification-service-group",
            topicIn: "inventory-allocated",
            status: "Healthy",
            ping: "9ms",
        },
    ];

    return (
        <div className="w-full space-y-8">
            {/* ردیف آمار تجمیعی */}
            <StatsOverview stats={mockStats} />

            {/* وضعیت زیرساخت توزیع‌شده و ورکرها */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* وضعیت ورکرها */}
                <div className="xl:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-indigo-400" />
                                Micro-Workers Mesh Status
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Consumer groups currently active in Kafka
                                partition loop
                            </p>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            3/3 Workers Active
                        </span>
                    </div>

                    <div className="space-y-3">
                        {workers.map((w, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Server className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-200">
                                            {w.name}
                                        </h4>
                                        <span className="text-xs font-mono text-slate-500">
                                            Group: {w.group}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-mono">
                                    <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                        Inbound:{" "}
                                        <span className="text-indigo-400">
                                            {w.topicIn}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <CheckCircle className="h-4 w-4" />
                                        <span>
                                            {w.status} ({w.ping})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* اتصالات سیستم ذخیره‌سازی و بروکر */}
                <div className="xl:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="pb-3 border-b border-slate-800">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-cyan-400" />
                            Core Infrastructure Probes
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Readiness status of system dependencies
                        </p>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Radio className="h-4 w-4 text-indigo-400" />
                                <span className="text-slate-300">
                                    Apache Kafka Cluster
                                </span>
                            </div>
                            <span className="text-emerald-400">
                                Online (3 Nodes)
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Database className="h-4 w-4 text-cyan-400" />
                                <span className="text-slate-300">
                                    PostgreSQL (Primary OLTP)
                                </span>
                            </div>
                            <span className="text-emerald-400">
                                Read / Write OK
                            </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Zap className="h-4 w-4 text-amber-400" />
                                <span className="text-slate-300">
                                    Redis In-Memory
                                </span>
                            </div>
                            <span className="text-emerald-400">
                                PONG (Rate Limit Active)
                            </span>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-[11px] text-slate-400">
                        All endpoints are instrumented with Prometheus{" "}
                        <code className="text-indigo-300">/metrics</code> and
                        Kubernetes{" "}
                        <code className="text-indigo-300">/ready</code> probes.
                    </div>
                </div>
            </div>
        </div>
    );
};
