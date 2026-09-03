import { Kafka } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import pino from "pino";
import { startHeartbeat } from "./lib/redis";

dotenv.config();

const logger = pino({
    transport: { target: "pino-pretty" },
    base: { service: "inventory-worker" },
});

const prisma = new PrismaClient();
const kafka = new Kafka({
    clientId: "inventory-worker",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "inventory-service-group" });
const producer = kafka.producer();

startHeartbeat("inventory-worker");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    await consumer.connect();
    await producer.connect();
    logger.info("Inventory Worker successfully connected to Kafka");

    await consumer.subscribe({
        topic: "payment-completed",
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const payload = JSON.parse(message.value.toString());
            const { orderId, items } = payload;

            logger.info(
                { orderId, partition },
                "Received event for inventory allocation",
            );

            try {
                // inventory checking simulation
                const delay = Number(process.env.PROCESSING_DELAY_MS) || 1000;
                await sleep(delay);

                // inventory update
                await prisma.$transaction(async (tx) => {
                    for (const item of items) {
                        const updateResult = await tx.product.updateMany({
                            where: {
                                id: item.productId,
                                stock: {
                                    gte: item.quantity,
                                },
                            },
                            data: {
                                stock: {
                                    decrement: item.quantity,
                                },
                            },
                        });

                        if (updateResult.count === 0) {
                            throw new Error(
                                `Insufficient stock for product ID: ${item.productId}`,
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
                                        "Inventory items successfully reserved atomically.",
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
                                orderId,
                                timestamp: new Date().toISOString(),
                            }),
                        },
                    ],
                });

                logger.info(
                    { orderId },
                    "Inventory allocated and published to inventory-allocated",
                );
            } catch (error: any) {
                logger.error(
                    { error: error.message, orderId },
                    "Inventory allocation failed",
                );

                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "INVENTORY_FAILED",
                        events: {
                            create: {
                                status: "INVENTORY_FAILED",
                                message:
                                    error.message ||
                                    "Inventory allocation failed due to out of stock.",
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
                                reason:
                                    error.message ||
                                    "Current stock is not enough for your order",
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
    logger.error({ err }, "Fatal error running Inventory Worker");
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