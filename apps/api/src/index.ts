import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import prisma from "./lib/prisma";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import {
    connectKafkaProducer,
    disconnectKafkaProducer,
    publishEvent,
} from "./lib/kafka";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "./lib/redis";
import { register, metricsMiddleware, orderCounter } from "./lib/metrics";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(metricsMiddleware);

app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(cors());

const orderRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args: string[]) =>
            redis.call(args[0], ...args.slice(1)) as any,
        prefix: "rl:orders:",
    }),
    message: {
        error: "Too many orders placed from this IP, please try again after a minute.",
    },
});

// ==========================================
// Kubernetes Health & Observability Probes
// ==========================================

// Liveness Probe
app.get("/healthz", (req: Request, res: Response) => {
    res.status(200).json({ status: "alive", uptime: process.uptime() });
});

// Readiness Probe
app.get("/ready", async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        const redisPing = await redis.ping();
        if (redisPing !== "PONG") {
            throw new Error("Redis did not return PONG");
        }

        res.status(200).json({
            status: "ready",
            database: "connected",
            redis: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        logger.error({ error: error.message }, "Readiness check failed");
        res.status(503).json({
            status: "not_ready",
            error: error.message,
        });
    }
});

// Prometheus Metrics
app.get("/metrics", async (req: Request, res: Response) => {
    try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

// Workers Status
app.get("/api/workers/status", async (req: Request, res: Response) => {
    try {
        const workerDefinitions = [
            {
                id: "inventory-worker",
                name: "Inventory Worker",
                group: "inventory-service-group",
                topicIn: "order-created",
                topicOut: "inventory-allocated",
            },
            {
                id: "payment-worker",
                name: "Payment Worker",
                group: "payment-service-group",
                topicIn: "inventory-allocated",
                topicOut: "payment-completed",
            },
            {
                id: "notification-worker",
                name: "Notification Worker",
                group: "notification-service-group",
                topicIn: "payment-completed",
                topicOut: "order-completed",
            },
        ];

        const workersStatus = await Promise.all(
            workerDefinitions.map(async (worker) => {
                const raw = await redis.get(`worker:heartbeat:${worker.id}`);
                if (!raw) {
                    return {
                        ...worker,
                        status: "DOWN",
                        lastSeen: null,
                    };
                }
                const data = JSON.parse(raw);
                return {
                    ...worker,
                    status: "UP",
                    lastSeen: data.timestamp,
                };
            }),
        );

        res.json(workersStatus);
    } catch (error) {
        logger.error({ err: error }, "Failed to query worker heartbeats");
        res.status(500).json({ error: "Failed to query worker heartbeats" });
    }
});

// ==========================================
// Business Endpoints
// ==========================================

app.get("/api/products", async (req: Request, res: Response) => {
    const CACHE_KEY = "cache:products:all";

    try {
        const cachedData = await redis.get(CACHE_KEY);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
        });

        await redis.set(CACHE_KEY, JSON.stringify(products), "EX", 60);

        res.json(products);
    } catch (error) {
        logger.error({ error }, "Error fetching products");
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.post(
    "/api/orders",
    orderRateLimiter,
    async (req: Request, res: Response) => {
        const { customerEmail, items } = req.body;

        if (
            !customerEmail ||
            !items ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            orderCounter.inc({ status: "invalid_payload" });
            return res.status(400).json({
                error: "Invalid order payload. Customer email and items are required.",
            });
        }

        try {
            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product) {
                    orderCounter.inc({ status: "product_not_found" });
                    return res.status(404).json({
                        error: `Product with ID ${item.productId} not found`,
                    });
                }
                if (product.stock < item.quantity) {
                    orderCounter.inc({ status: "out_of_stock" });
                    return res.status(400).json({
                        error: `Not enough stock for ${product.name}`,
                    });
                }
                totalAmount += product.price * item.quantity;
                orderItemsData.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.price,
                });
            }

            const newOrder = await prisma.order.create({
                data: {
                    customerEmail,
                    totalAmount,
                    status: "PENDING",
                    items: {
                        create: orderItemsData,
                    },
                    events: {
                        create: {
                            status: "PENDING",
                            message:
                                "Order created. Event queued for Inventory Worker.",
                        },
                    },
                },
                include: {
                    items: { include: { product: true } },
                    events: true,
                },
            });

            await publishEvent("order-created", newOrder.id, {
                orderId: newOrder.id,
                customerEmail: newOrder.customerEmail,
                totalAmount: newOrder.totalAmount,
                items: newOrder.items.map((i) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    price: i.price,
                })),
                createdAt: newOrder.createdAt.toISOString(),
            });

            orderCounter.inc({ status: "created" });

            res.status(201).json(newOrder);
        } catch (error) {
            orderCounter.inc({ status: "failed" });
            logger.error({ error }, "Error creating order");
            res.status(500).json({ error: "Failed to create order" });
        }
    },
);

app.get("/api/orders", async (req: Request, res: Response) => {
    const { status } = req.query;

    try {
        const orders = await prisma.order.findMany({
            where: status ? { status: String(status) as any } : undefined,
            include: {
                items: { include: { product: true } },
                events: { orderBy: { createdAt: "desc" }, take: 1 },
            },
            orderBy: { createdAt: "desc" },
        });
        res.json(orders);
    } catch (error) {
        logger.error({ error }, "Error fetching orders");
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

app.get("/api/orders/:id", async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                events: { orderBy: { createdAt: "asc" } },
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);
    } catch (error) {
        logger.error({ error }, "Error fetching order");
        res.status(500).json({ error: "Failed to fetch order details" });
    }
});

app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
        const totalOrders = await prisma.order.count();
        const completedOrders = await prisma.order.count({
            where: { status: "COMPLETED" },
        });
        const pendingOrders = await prisma.order.count({
            where: {
                status: {
                    in: [
                        "PENDING",
                        "PAYMENT_PROCESSING",
                        "PAYMENT_COMPLETED",
                        "INVENTORY_ALLOCATED",
                    ],
                },
            },
        });
        const failedOrders = await prisma.order.count({
            where: {
                status: {
                    in: ["PAYMENT_FAILED", "INVENTORY_FAILED", "CANCELLED"],
                },
            },
        });

        const revenueResult = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { status: "COMPLETED" },
        });

        res.json({
            totalOrders,
            completedOrders,
            pendingOrders,
            failedOrders,
            totalRevenue: revenueResult._sum.totalAmount || 0,
        });
    } catch (error) {
        logger.error({ error }, "Error calculating dashboard stats");
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

const server = app.listen(PORT, async () => {
    logger.info(`PulseOps API running on port ${PORT}`);
    try {
        await connectKafkaProducer();
    } catch (err) {
        logger.error(
            { err },
            "Could not pre-connect to Kafka Broker on startup",
        );
    }
});

const handleShutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown initiated...");

    server.close(async () => {
        logger.info("HTTP server closed to new requests.");

        try {
            await disconnectKafkaProducer();

            await redis.quit();
            logger.info("Redis connection closed.");

            await prisma.$disconnect();
            logger.info("Database connection closed.");

            logger.info("PulseOps API shut down gracefully.");
            process.exit(0);
        } catch (err) {
            logger.error({ err }, "Error during graceful shutdown");
            process.exit(1);
        }
    });

    setTimeout(() => {
        logger.error("Forceful shutdown after timeout");
        process.exit(1);
    }, 10000).unref();
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
