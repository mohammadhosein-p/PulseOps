import client from "prom-client";
import { Request, Response, NextFunction } from "express";

export const register = new client.Registry();
client.collectDefaultMetrics({
    register,
    prefix: "pulseops_api_",
});

export const httpRequestDurationHistogram = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});

export const orderCounter = new client.Counter({
    name: "pulseops_orders_total",
    help: "Total number of orders submitted to the API",
    labelNames: ["status"],
    registers: [register],
});

export const metricsMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const start = process.hrtime();

    res.on("finish", () => {
        if (
            req.path === "/metrics" ||
            req.path === "/healthz" ||
            req.path === "/ready"
        ) {
            return;
        }

        const diff = process.hrtime(start);
        const durationInSeconds = diff[0] + diff[1] / 1e9;

        const route = req.route?.path || req.path;

        httpRequestDurationHistogram.observe(
            {
                method: req.method,
                route,
                status_code: res.statusCode.toString(),
            },
            durationInSeconds,
        );
    });

    next();
};
