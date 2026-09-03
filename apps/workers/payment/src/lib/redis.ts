import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export function startHeartbeat(
    workerId: string,
    intervalMs = 3000,
    ttlSeconds = 6,
) {
    const send = async () => {
        try {
            const payload = JSON.stringify({
                workerId,
                timestamp: new Date().toISOString(),
                pid: process.pid,
            });
            await redis.set(
                `worker:heartbeat:${workerId}`,
                payload,
                "EX",
                ttlSeconds,
            );
        } catch (err) {
            console.error(`[Heartbeat Error] ${workerId}:`, err);
        }
    };

    send();
    const timer = setInterval(send, intervalMs);
    return () => {
        clearInterval(timer);
        redis.del(`worker:heartbeat:${workerId}`).catch(() => {});
    };
}
