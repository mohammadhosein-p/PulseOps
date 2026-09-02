import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { connectKafkaProducer, publishEvent } from "./lib/kafka";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "ok",
        service: "pulseops-api",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/products", async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.post("/api/orders", async (req: Request, res: Response) => {
    const { customerEmail, items } = req.body;

    if (
        !customerEmail ||
        !items ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
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
                return res.status(404).json({
                    error: `Product with ID ${item.productId} not found`,
                });
            }
            if (product.stock < item.quantity) {
                return res
                    .status(400)
                    .json({ error: `Not enough stock for ${product.name}` });
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
                            "Order created. Event queued for Payment Worker.",
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

        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

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
        console.error("Error fetching orders:", error);
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
        console.error("Error fetching order:", error);
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
        console.error("Error calculating dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
});

app.listen(PORT, async () => {
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