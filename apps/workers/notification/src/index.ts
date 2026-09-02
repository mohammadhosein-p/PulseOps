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

async function run() {
    await consumer.connect();
    logger.info("Notification Worker successfully connected to Kafka");

    await consumer.subscribe({
        topic: "inventory-allocated",
        fromBeginning: false,
    });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;

            const payload = JSON.parse(message.value.toString());
            const { orderId } = payload;

            logger.info(
                { orderId, partition },
                "Received event for notification dispatch",
            );

            try {
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { customerEmail: true, totalAmount: true },
                });

                if (!order) {
                    throw new Error(`Order with ID ${orderId} not found`);
                }

                // sending notification delay simulation
                const delay = Number(process.env.PROCESSING_DELAY_MS) || 800;
                await sleep(delay);

                // db update
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: "COMPLETED",
                        events: {
                            create: {
                                status: "COMPLETED",
                                message: `Order completed. Invoice and confirmation email sent to ${order.customerEmail}.`,
                            },
                        },
                    },
                });

                logger.info(
                    { orderId, email: order.customerEmail },
                    "Order marked as COMPLETED and notification delivered",
                );
            } catch (error: any) {
                logger.error(
                    { error: error.message, orderId },
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
