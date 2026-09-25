import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    insecureSkipTLSVerify: true,
    scenarios: {
        keda_heavy_stress: {
            executor: "ramping-arrival-rate",
            startRate: 50,
            timeUnit: "1s",
            preAllocatedVUs: 200,
            maxVUs: 800,
            stages: [
                { duration: "30s", target: 200 },
                { duration: "1m", target: 800 },
                { duration: "2m", target: 800 },
                { duration: "30s", target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_failed: ["rate<0.05"],
    },
};

// const BASE_URL = __ENV.TARGET_URL || 'http://pulseops-api.default.svc.cluster.local:4000';
const BASE_URL = 'http://pulseops-api.default.svc.cluster.local:4000';

let cachedProductId = null;

export function setup() {
    const res = http.get(`${BASE_URL}/api/products`);
    if (res.status === 200) {
        const products = JSON.parse(res.body);
        if (products.length > 0) {
            return { productId: products[0].id };
        }
    }
    return { productId: null };
}

export default function (data) {
    if (!data.productId) return;

    const headers = {
        "Content-Type": "application/json",
        "X-Forwarded-For": `10.0.${__VU % 250}.${Math.floor(Math.random() * 250) + 1}`,
    };

    const payload = JSON.stringify({
        customerEmail: `stress-user-${__VU}-${Date.now()}@pulseops.io`,
        items: [
            {
                productId: data.productId,
                quantity: 1,
            },
        ],
    });

    const res = http.post(`${BASE_URL}/api/orders`, payload, { headers });

    check(res, {
        "order submitted": (r) => r.status === 201,
    });
}
