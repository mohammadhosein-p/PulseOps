import { Kafka } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import pino from "pino";

dotenv.config();

const logger = pino({
    transport: { target: "pino-pretty" },
    base: { service: "notification-worker" },
});

const prisma = new PrismaClient();
const kafka = new Kafka({
    clientId: "notification-worker",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-service-group" });

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
        case "inventory-allocated":
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
            "inventory-allocated",
            "payment-failed",
            "inventory-failed",
            "order-cancelled",
        ],
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

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
                if (topic === "inventory-allocated") {
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
            } catch (error: any) {
                logger.error(
                    { error: error.message, orderId, topic },
                    "Failed to dispatch notification",
                );
            }
        },
    });
}

run().catch((err) => {
    logger.error({ err }, "Fatal error running Notification Worker");
    process.exit(1);
});
