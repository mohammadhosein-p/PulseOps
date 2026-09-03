import React from "react";
import { NavLink } from "react-router-dom";
import {
    Radio,
    ShoppingBag,
    LayoutDashboard,
    GitCommit,
    ShieldCheck,
} from "lucide-react";

export const Navbar: React.FC = () => {
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }`;

    return (
        <nav className="w-full border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-6 py-3 sticky top-0 z-50">
            <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                        <Radio className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white tracking-wide">
                                PulseOps
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                DISTRIBUTED
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Order System & Event Orchestration
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                    <NavLink to="/" className={navLinkClass}>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Storefront</span>
                    </NavLink>
                    <NavLink to="/dashboard" className={navLinkClass}>
                        <LayoutDashboard className="h-4 w-4" />
                        <span>SRE Dashboard</span>
                    </NavLink>
                    <NavLink to="/orders" className={navLinkClass}>
                        <GitCommit className="h-4 w-4" />
                        <span>Pipeline Inspector</span>
                    </NavLink>
                </div>

                <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Cluster Healthy</span>
                    </div>
                </div>
            </div>
        </nav>
    );
};
