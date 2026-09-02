import { Kafka, Producer } from "kafkajs";
import { logger } from "./logger";

const kafka = new Kafka({
    clientId: "pulseops-api",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    retry: {
        initialRetryTime: 300,
        retries: 5,
    },
});

let producer: Producer | null = null;

export const connectKafkaProducer = async (): Promise<Producer> => {
    if (!producer) {
        producer = kafka.producer();
        await producer.connect();
        logger.info("Connected to Kafka Broker successfully");
    }
    return producer;
};

export const publishEvent = async (
    topic: string,
    key: string,
    message: object,
): Promise<void> => {
    try {
        const prod = await connectKafkaProducer();
        await prod.send({
            topic,
            messages: [
                {
                    key,
                    value: JSON.stringify(message),
                },
            ],
        });
        logger.info({ topic, key }, "Kafka event published successfully");
    } catch (error) {
        logger.error(
            { error, topic, key },
            "Failed to publish message to Kafka",
        );
        throw error;
    }
};
