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

const WORKER_NAME = "payment-worker";
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

const consumer = kafka.consumer({ groupId: "payment-service-group" });
const producer = kafka.producer();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    await consumer.connect();
    await producer.connect();
    logger.info("Payment Worker successfully connected to Kafka");

    await consumer.subscribe({
        topic: "inventory-allocated",
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const stopTimer = workerProcessingDuration.startTimer({
                worker: WORKER_NAME,
                topic,
            });

            const orderData = JSON.parse(message.value.toString());
            const orderId = orderData.orderId;

            logger.info(
                { orderId, partition },
                "Received order for payment processing",
            );

            try {
                const delay = Number(process.env.PROCESSING_DELAY_MS) || 1500;
                await sleep(delay);

                const isDeclined = Number(orderData.totalAmount) > 10000;

                if (isDeclined) {
                    throw new Error(
                        "Payment gateway declined: Exceeded maximum transaction limit.",
                    );
                }

                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "PAYMENT_COMPLETED",
                        events: {
                            create: {
                                status: "PAYMENT_COMPLETED",
                                message: `Payment of $${orderData.totalAmount} processed successfully.`,
                            },
                        },
                    },
                });

                await producer.send({
                    topic: "payment-completed",
                    messages: [
                        {
                            key: orderId,
                            value: JSON.stringify({
                                orderId,
                                items: orderData.items,
                                customerEmail: orderData.customerEmail,
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
                    "Payment processed and published to payment-completed",
                );
            } catch (error: any) {
                const isLimitError = error.message?.includes(
                    "Exceeded maximum transaction limit",
                );
                const errorType = isLimitError
                    ? "declined_limit_exceeded"
                    : "payment_gateway_error";

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

                logger.error(
                    { error: error.message, orderId },
                    "Failed to process payment",
                );

                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "PAYMENT_FAILED",
                        events: {
                            create: {
                                status: "PAYMENT_FAILED",
                                message:
                                    error.message ||
                                    "Payment gateway transaction failed.",
                            },
                        },
                    },
                });

                await producer.send({
                    topic: "payment-failed",
                    messages: [
                        {
                            key: orderId,
                            value: JSON.stringify({
                                orderId,
                                items: orderData.items,
                                reason:
                                    error.message ||
                                    "Payment gateway transaction failed.",
                                timestamp: new Date().toISOString(),
                            }),
                        },
                    ],
                });
            } finally {
                stopTimer();
            }
        },
    });
}

run().catch((err) => {
    logger.error({ err }, "Fatal error running Payment Worker");
    process.exit(1);
});

const shutdown = async (signal: string) => {
    logger.info(
        { signal },
        "Graceful shutdown initiated for Payment Worker...",
    );
    try {
        metricsServer.close();
        await consumer.disconnect();
        await producer.disconnect();
        await prisma.$disconnect();
        logger.info("Payment Worker connections closed cleanly.");
        process.exit(0);
    } catch (err) {
        logger.error({ err }, "Error during worker shutdown");
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
