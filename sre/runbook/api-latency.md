# API Latency Runbook

## Alert

`PulseOpsAPILatencyHigh`

## Symptoms

API p95 latency has exceeded 500ms for at least 5 minutes.

## Initial Checks

Check API pods:

```bash
kubectl get pods -l app=pulseops-api
```

Check resource usage:

```bash
kubectl top pods -l app=pulseops-api
```

Check API logs:

```bash
kubectl logs -l app=pulseops-api --tail=200
```

## Prometheus Checks

Check p95 latency:

```promql
pulseops:sli:api_latency:p95_5m
```

Check request rate:

```promql
pulseops:sli:api_requests:rate5m
```

## Possible Causes

- Increased request load
- CPU throttling
- Memory pressure
- Slow PostgreSQL queries
- Redis latency
- Kafka dependency latency
- Application-level performance regression
- Insufficient API replicas

## Recovery

1. Determine whether latency correlates with increased traffic.
2. Check CPU and memory usage.
3. Check database and Redis health.
4. Check recent deployments.
5. If required, scale API replicas or rollback the problematic deployment.

## Verification

Confirm that p95 latency remains below 500ms and resource usage has returned to a normal range.
