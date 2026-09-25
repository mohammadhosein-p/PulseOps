# API Availability Runbook

## Alert

`PulseOpsAPIAvailabilityFastBurn`
`PulseOpsAPIAvailabilitySlowBurn`

## Symptoms

The PulseOps API is returning an unusually high number of 5xx responses.

## Initial Checks

Check API pods:

```bash
kubectl get pods -l app=pulseops-api
```

Check recent API logs:

```bash
kubectl logs -l app=pulseops-api --tail=200
```

Check pod restarts:

```bash
kubectl get pods -l app=pulseops-api
```

Check recent Kubernetes events:

```bash
kubectl get events --sort-by=.lastTimestamp
```

## Prometheus Checks

Check current availability:

```promql
pulseops:sli:api_availability:ratio5m
```

Check current error rate:

```promql
pulseops:slo:api_availability:error_ratio5m
```

Check burn rate:

```promql
pulseops:slo:api_availability:burn_rate5m
```

## Possible Causes

- API pod crash or restart
- Application exception
- Database connectivity failure
- Redis connectivity failure
- Kafka dependency failure
- Resource exhaustion
- Kubernetes scheduling or networking issue
- Recent application deployment

## Recovery

1. Identify whether the failure affects all API pods or only one pod.
2. Check application logs for the first observed errors.
3. Check PostgreSQL, Redis and Kafka health.
4. Check whether a recent deployment introduced the issue.
5. If necessary, rollback the application deployment.

## Verification

Confirm that:

- 5xx rate has returned to normal.
- API availability has recovered.
- Burn rate is decreasing.
- No additional pod crashes are occurring.

## Escalation

If the issue cannot be resolved quickly, document the incident and create a postmortem.
