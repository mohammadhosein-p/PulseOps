import Redis from "ioredis";
import { logger } from "./logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        return delay;
    },
});

redis.on("connect", () => {
    logger.info("Connected to Redis successfully");
});

redis.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
});
