import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
    insecureSkipTLSVerify: true,
    stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 50 },
        { duration: "30s", target: 0 },
    ],
    thresholds: {
        http_req_failed: ["rate<0.005"],
        http_req_duration: ["p(95)<500"],
    },
};

const BASE_URL = __ENV.TARGET_URL || "http://pulseops-api:4000";

export default function () {
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "k6-loadtest/pulseops",
    };

    group("Health Probes", function () {
        const liveRes = http.get(`${BASE_URL}/healthz`, { headers });
        check(liveRes, { "healthz is 200": (r) => r.status === 200 });

        const readyRes = http.get(`${BASE_URL}/ready`, { headers });
        check(readyRes, { "ready is 200": (r) => r.status === 200 });
    });

    let targetProductId = null;
    group("Fetch Products", function () {
        const prodRes = http.get(`${BASE_URL}/api/products`, { headers });
        const isOk = check(prodRes, {
            "products status 200": (r) => r.status === 200,
        });

        if (isOk) {
            try {
                const products = JSON.parse(prodRes.body);
                if (Array.isArray(products) && products.length > 0) {
                    targetProductId = products[0].id;
                }
            } catch (e) {}
        }
    });

    group("Stats & Workers", function () {
        const statsRes = http.get(`${BASE_URL}/api/dashboard/stats`, {
            headers,
        });
        check(statsRes, { "stats is 200": (r) => r.status === 200 });

        const workerRes = http.get(`${BASE_URL}/api/workers/status`, {
            headers,
        });
        check(workerRes, { "workers is 200": (r) => r.status === 200 });
    });

    if (targetProductId) {
        group("Place Order", function () {
            const payload = JSON.stringify({
                customerEmail: `sre-test-${__VU}@pulseops.io`,
                items: [
                    {
                        productId: targetProductId,
                        quantity: 1,
                    },
                ],
            });

            const orderRes = http.post(`${BASE_URL}/api/orders`, payload, {
                headers,
            });
            check(orderRes, {
                "order status 201 or 429": (r) =>
                    r.status === 201 || r.status === 429,
            });
        });
    }

    sleep(Math.random() * 0.8 + 0.2);
}
