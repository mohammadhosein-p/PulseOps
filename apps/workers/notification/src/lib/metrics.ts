import http from "http";
import client from "prom-client";

client.collectDefaultMetrics({ prefix: "pulseops_worker_" });

export const workerProcessedTotal = new client.Counter({
    name: "pulseops_worker_processed_events_total",
    help: "Total number of Kafka events processed by this worker",
    labelNames: ["worker", "topic", "status"],
});

export const workerProcessingDuration = new client.Histogram({
    name: "pulseops_worker_processing_duration_seconds",
    help: "Duration of processing an event in seconds",
    labelNames: ["worker", "topic"],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

export const workerErrorsTotal = new client.Counter({
    name: "pulseops_worker_errors_total",
    help: "Total number of errors encountered while processing events",
    labelNames: ["worker", "topic", "error_type"],
});

export function startMetricsServer(
    workerName: string,
    port = 9102,
): http.Server {
    const server = http.createServer(async (req, res) => {
        if (req.url === "/metrics" && req.method === "GET") {
            try {
                res.setHeader("Content-Type", client.register.contentType);
                const metrics = await client.register.metrics();
                res.writeHead(200);
                res.end(metrics);
            } catch (err) {
                res.writeHead(500);
                res.end("Error generating metrics");
            }
        } else {
            res.writeHead(404);
            res.end("Not Found");
        }
    });

    server.listen(port, () => {
        console.log(
            `[Metrics] ${workerName} metrics server listening on port ${port}`,
        );
    });

    return server;
}
