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

const WORKER_NAME = "notification-worker";
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

const consumer = kafka.consumer({ groupId: "notification-service-group" });

startHeartbeat(WORKER_NAME);

const metricsServer = startMetricsServer(WORKER_NAME, METRICS_PORT);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface NotificationTemplate {
    subject: string;
    body: string;
    logLevel: "info" | "warn" | "error";
}

function buildNotification(
    topic: string,
    orderId: string,
    email: string,
    extraData: any,
): NotificationTemplate {
    switch (topic) {
        case "payment-completed":
            return {
                subject: "سفارش شما با موفقیت تکمیل شد",
                body: `سلام، سفارش شما به شماره ${orderId} با موفقیت تایید و پردازش شد. اقلام در صف ارسال قرار گرفتند.`,
                logLevel: "info",
            };

        case "payment-failed":
            return {
                subject: "خطا در پرداخت سفارش",
                body: `کاربر گرامی (${email})، پرداخت سفارش شماره ${orderId} ناموفق بود. دلیل: ${extraData.reason || "رد تراکنش توسط بانک"}. لطفاً مجدداً تلاش فرمایید.`,
                logLevel: "warn",
            };

        case "inventory-failed":
            return {
                subject: "عدم تامین موجودی سفارش",
                body: `متاسفانه به دلیل اتمام موجودی انبار، سفارش شماره ${orderId} لغو شد. در صورت کسر وجه، مبلغ طی ۷۲ ساعت عودت داده می‌شود.`,
                logLevel: "error",
            };

        case "order-cancelled":
            return {
                subject: "لغو سفارش",
                body: `سفارش شماره ${orderId} با موفقیت لغو شد.`,
                logLevel: "info",
            };

        default:
            return {
                subject: "به‌روزرسانی وضعیت سفارش",
                body: `وضعیت سفارش شماره ${orderId} تغییر کرد.`,
                logLevel: "info",
            };
    }
}

async function run() {
    await consumer.connect();
    logger.info("Notification Worker successfully connected to Kafka");

    await consumer.subscribe({
        topics: [
            "payment-completed",
            "payment-failed",
            "inventory-failed",
            "order-cancelled",
        ],
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const stopTimer = workerProcessingDuration.startTimer({
                worker: WORKER_NAME,
                topic,
            });

            const payload = JSON.parse(message.value.toString());
            const { orderId } = payload;

            try {
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { customerEmail: true },
                });

                const recipient = order?.customerEmail || "unknown-customer";

                // notification delay simulation
                const delay = Number(process.env.PROCESSING_DELAY_MS) || 600;
                await sleep(delay);

                const notification = buildNotification(
                    topic,
                    orderId,
                    recipient,
                    payload,
                );

                logger[notification.logLevel](
                    {
                        topic,
                        orderId,
                        recipient,
                        subject: notification.subject,
                        body: notification.body,
                    },
                    `[NOTIFICATION SENT] ${notification.subject}`,
                );

                // order completion
                if (topic === "payment-completed") {
                    await prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: "COMPLETED",
                            events: {
                                create: {
                                    status: "COMPLETED",
                                    message: `Order completed successfully. Confirmation email sent to ${recipient}.`,
                                },
                            },
                        },
                    });
                }

                workerProcessedTotal.inc({
                    worker: WORKER_NAME,
                    topic,
                    status: "success",
                });
            } catch (error: any) {
                workerErrorsTotal.inc({
                    worker: WORKER_NAME,
                    topic,
                    error_type: "notification_dispatch_failed",
                });
                workerProcessedTotal.inc({
                    worker: WORKER_NAME,
                    topic,
                    status: "failed",
                });

                logger.error(
                    { error: error.message, orderId, topic },
                    "Failed to dispatch notification",
                );
            } finally {
                stopTimer();
            }
        },
    });
}

run().catch((err) => {
    logger.error({ err }, "Fatal error running Notification Worker");
    process.exit(1);
});

const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated for worker...");
    try {
        metricsServer.close();

        await consumer.disconnect();
        logger.info("Kafka consumer disconnected cleanly.");

        await prisma.$disconnect();
        logger.info("Prisma disconnected.");

        process.exit(0);
    } catch (err) {
        logger.error({ err }, "Error during worker shutdown");
        process.exit(1);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
