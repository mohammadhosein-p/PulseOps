import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

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
                            "Order created successfully. Waiting for payment processing.",
                    },
                },
            },
            include: {
                items: { include: { product: true } },
                events: true,
            },
        });

        // TODO: orderCreated connect to kafka

        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Failed to create order" });
    }
});

app.listen(PORT, () => {
    console.log(`PulseOps API running on port ${PORT}`);
});
