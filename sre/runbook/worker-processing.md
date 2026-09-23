# Worker Processing Runbook

## Alert

`PulseOpsWorkerProcessingFastBurn`
`PulseOpsWorkerProcessingSlowBurn`

## Symptoms

Worker processing failures are consuming the error budget faster than expected.

## Initial Checks

Check worker pods:

```bash
kubectl get pods | grep worker
```

Check worker logs:

```bash
kubectl logs <worker-pod> --tail=200
```

Check Kafka pods:

```bash
kubectl get pods -l app=kafka
```

## Prometheus Checks

Check worker success ratio:

```promql
pulseops:sli:worker_processing:success_ratio5m
```

Check worker error ratio:

```promql
pulseops:slo:worker_processing:error_ratio5m
```

Check worker burn rate:

```promql
pulseops:slo:worker_processing:burn_rate5m
```

## Kafka Checks

Check Kafka consumer lag and consumer group health.

Investigate whether lag is increasing or decreasing.

## Possible Causes

- Worker application errors
- Kafka connectivity problems
- Invalid or malformed events
- PostgreSQL failure
- Redis failure
- Worker resource exhaustion
- Increased event rate
- Consumer lag

## Recovery

1. Identify the affected worker.
2. Inspect worker logs.
3. Check Kafka connectivity and consumer lag.
4. Check PostgreSQL and Redis.
5. Restart or replace unhealthy worker pods if necessary.
6. If processing backlog exists, verify that workers catch up after recovery.

## Verification

Confirm that:

- Worker success rate has recovered.
- Error rate is decreasing.
- Kafka consumer lag is decreasing.
- Workers remain healthy.

## Escalation

If events continue failing after recovery attempts, preserve relevant logs and metrics and create an incident record/postmortem.
