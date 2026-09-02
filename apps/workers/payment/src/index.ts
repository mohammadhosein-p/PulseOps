import { Kafka } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import pino from "pino";

dotenv.config();

const logger = pino({
    transport: { target: "pino-pretty" },
    base: { service: "payment-worker" },
});

const prisma = new PrismaClient();
const kafka = new Kafka({
    clientId: "payment-worker",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "payment-service-group" });
const producer = kafka.producer();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    await consumer.connect();
    await producer.connect();
    logger.info("Payment Worker successfully connected to Kafka");

    await consumer.subscribe({ topic: "order-created", fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const orderData = JSON.parse(message.value.toString());
            const orderId = orderData.orderId;

            logger.info(
                { orderId, partition },
                "Received order for payment processing",
            );

            try {
                // payment delay simulation
                const delay = Number(process.env.PROCESSING_DELAY_MS) || 1500;
                await sleep(delay);

                // order status update
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

                // pass to Inventory Worker by calling event
                await producer.send({
                    topic: "payment-completed",
                    messages: [
                        {
                            key: orderId,
                            value: JSON.stringify({
                                orderId,
                                items: orderData.items,
                                timestamp: new Date().toISOString(),
                            }),
                        },
                    ],
                });

                logger.info(
                    { orderId },
                    "Payment processed and published to payment-completed",
                );
            } catch (error) {
                logger.error({ error, orderId }, "Failed to process payment");

                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "PAYMENT_FAILED",
                        events: {
                            create: {
                                status: "PAYMENT_FAILED",
                                message: "Payment gateway transaction failed.",
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
                                reason: "Order failed, payment gateway failed or time exceeded",
                                timestamp: new Date().toISOString(),
                            }),
                        },
                    ],
                });
            }
        },
    });
}

run().catch((err) => {
    logger.error({ err }, "Fatal error running Payment Worker");
    process.exit(1);
});

const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated for worker...");
    try {
        await consumer.disconnect();

        if (typeof producer !== "undefined") {
            await producer.disconnect();
        }
        logger.info("Kafka consumer/producer disconnected cleanly.");

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
