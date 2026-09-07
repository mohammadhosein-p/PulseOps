const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("Clearing existing products...");
    await prisma.orderEvent.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();

    console.log("Seeding initial products...");
    await prisma.product.createMany({
        data: [
            {
                name: "Cloud Server VPS-1",
                description: "Standard 2 vCPU, 4GB RAM instance",
                price: 25.0,
                stock: 50,
            },
            {
                name: "Dedicated K8s Node",
                description: "Bare-metal 8 vCPU, 32GB RAM worker node",
                price: 120.0,
                stock: 15,
            },
            {
                name: "Managed Kafka Cluster",
                description: "High-throughput 3-broker event bus",
                price: 85.0,
                stock: 10,
            },
            {
                name: "Distributed Object Storage 1TB",
                description: "S3-compatible scalable block storage",
                price: 15.0,
                stock: 100,
            },
        ],
    });

    console.log("Seed completed successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
