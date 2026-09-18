import type { OrderEvent, OrderStatus } from "../types";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
        case "COMPLETED":
            return {
                icon: CheckCircle2,
                color: "text-emerald-400",
                border: "border-emerald-500/30",
                bg: "bg-emerald-500/10",
            };
        case "PAYMENT_FAILED":
        case "INVENTORY_FAILED":
        case "CANCELLED":
            return {
                icon: XCircle,
                color: "text-rose-400",
                border: "border-rose-500/30",
                bg: "bg-rose-500/10",
            };
        default:
            return {
                icon: Clock,
                color: "text-amber-400",
                border: "border-amber-500/30",
                bg: "bg-amber-500/10",
            };
    }
};

interface Prop {
    events: OrderEvent[];
}

// export const Timeline: React.FC<{ events: OrderEvent[] }> = ({ events }) => {

export const Timeline = ({ events }: Prop) => {
    return (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {(Array.isArray(events) ? events : []).map((event) => {
                const {
                    icon: Icon,
                    color,
                    border,
                    bg,
                } = getStatusBadge(event.status);
                return (
                    <div key={event.id} className="relative group">
                        <span
                            className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 ring-4 ring-slate-900 ${color}`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div
                            className={`p-3 rounded-lg border ${border} ${bg} transition-all`}
                        >
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span
                                    className={`font-semibold tracking-wide ${color}`}
                                >
                                    {event.status}
                                </span>
                                <span className="text-slate-400">
                                    {new Date(
                                        event.createdAt,
                                    ).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-sm text-slate-300 font-mono">
                                {event.message}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
