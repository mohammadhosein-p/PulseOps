import { Kafka } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import pino from "pino";
import { startHeartbeat } from "./lib/redis";
import {
    startMetricsServer,
    workerProcessedTotal,
    workerProcessingDuration,
    workerErrorsTotal,
} from "./lib/metrics";

dotenv.config();

const WORKER_NAME = "inventory-worker";
const METRICS_PORT = Number(process.env.METRICS_PORT) || 9102;

const logger = pino({
    transport: { target: "pino-pretty" },
    base: { service: WORKER_NAME },
});

const prisma = new PrismaClient();
const kafka = new Kafka({
    clientId: WORKER_NAME,
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

startHeartbeat(WORKER_NAME);

const metricsServer = startMetricsServer(WORKER_NAME, METRICS_PORT);

const consumer = kafka.consumer({ groupId: "inventory-service-group" });
const producer = kafka.producer();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    await consumer.connect();
    await producer.connect();
    logger.info("Inventory Worker successfully connected to Kafka");

    await consumer.subscribe({
        topics: ["order-created", "payment-failed"],
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const stopTimer = workerProcessingDuration.startTimer({
                worker: WORKER_NAME,
                topic,
            });

            const eventData = JSON.parse(message.value.toString());
            const { orderId, items } = eventData;

            try {
                if (topic === "order-created") {
                    logger.info(
                        { orderId, partition },
                        "Processing atomic inventory allocation",
                    );

                    try {
                        const delay =
                            Number(process.env.PROCESSING_DELAY_MS) || 1000;
                        await sleep(delay);

                        await prisma.$transaction(async (tx) => {
                            for (const item of items) {
                                const updateResult =
                                    await tx.product.updateMany({
                                        where: {
                                            id: item.productId,
                                            stock: { gte: item.quantity },
                                        },
                                        data: {
                                            stock: { decrement: item.quantity },
                                        },
                                    });

                                if (updateResult.count === 0) {
                                    throw new Error(
                                        `INSUFFICIENT_STOCK_${item.productId}`,
                                    );
                                }
                            }

                            await tx.order.update({
                                where: { id: orderId },
                                data: {
                                    status: "INVENTORY_ALLOCATED",
                                    events: {
                                        create: {
                                            status: "INVENTORY_ALLOCATED",
                                            message:
                                                "Stock atomically reserved. Forwarding to Payment Worker.",
                                        },
                                    },
                                },
                            });
                        });

                        await producer.send({
                            topic: "inventory-allocated",
                            messages: [
                                {
                                    key: orderId,
                                    value: JSON.stringify({
                                        ...eventData,
                                        timestamp: new Date().toISOString(),
                                    }),
                                },
                            ],
                        });

                        workerProcessedTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            status: "success",
                        });

                        logger.info(
                            { orderId },
                            "Inventory atomically reserved and published to inventory-allocated",
                        );
                    } catch (error: any) {
                        const isStockError =
                            error.message?.startsWith("INSUFFICIENT_STOCK");
                        const errorType = isStockError
                            ? "insufficient_stock"
                            : "db_error";

                        workerErrorsTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            error_type: errorType,
                        });
                        workerProcessedTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            status: "failed",
                        });

                        logger.warn(
                            { orderId, error: error.message },
                            "Atomic reservation failed: Insufficient stock",
                        );

                        await prisma.order.update({
                            where: { id: orderId },
                            data: {
                                status: "INVENTORY_FAILED",
                                events: {
                                    create: {
                                        status: "INVENTORY_FAILED",
                                        message:
                                            "Order failed due to insufficient stock.",
                                    },
                                },
                            },
                        });

                        await producer.send({
                            topic: "inventory-failed",
                            messages: [
                                {
                                    key: orderId,
                                    value: JSON.stringify({
                                        orderId,
                                        reason: "OUT_OF_STOCK",
                                        timestamp: new Date().toISOString(),
                                    }),
                                },
                            ],
                        });
                    }
                }

                if (topic === "payment-failed") {
                    logger.warn(
                        { orderId },
                        "Payment failed. Executing compensating transaction to restock items",
                    );

                    try {
                        await prisma.$transaction(async (tx) => {
                            if (Array.isArray(items)) {
                                for (const item of items) {
                                    await tx.product.update({
                                        where: { id: item.productId },
                                        data: {
                                            stock: { increment: item.quantity },
                                        },
                                    });
                                }
                            }

                            await tx.order.update({
                                where: { id: orderId },
                                data: {
                                    status: "CANCELLED",
                                    events: {
                                        create: {
                                            status: "CANCELLED",
                                            message:
                                                "Order cancelled. Reserved stock was rolled back to inventory due to payment failure.",
                                        },
                                    },
                                },
                            });
                        });

                        workerProcessedTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            status: "restocked",
                        });

                        logger.info(
                            { orderId },
                            "Compensating transaction completed. Items restocked and order marked as CANCELLED.",
                        );
                    } catch (error) {
                        workerErrorsTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            error_type: "rollback_failed",
                        });
                        workerProcessedTotal.inc({
                            worker: WORKER_NAME,
                            topic,
                            status: "failed",
                        });

                        logger.error(
                            { error, orderId },
                            "Failed to execute compensating transaction for inventory",
                        );
                    }
                }
            } finally {
                stopTimer();
            }
        },
    });
}

run().catch((err) => {
    logger.error({ err }, "Fatal error running Inventory Worker");
    process.exit(1);
});

const shutdown = async (signal: string) => {
    logger.info(
        { signal },
        "Graceful shutdown initiated for Inventory Worker...",
    );
    try {
        metricsServer.close();
        await consumer.disconnect();
        await producer.disconnect();
        await prisma.$disconnect();
        logger.info("Inventory Worker connections closed cleanly.");
        process.exit(0);
    } catch (err) {
        logger.error({ err }, "Error during worker shutdown");
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
