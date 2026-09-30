# Monitoring & Observability

This project covers the three pillars of basic observability: **logs**,
**metrics** and **health checks**.

---

## 1. Health checks

| Endpoint | Purpose | Used by |
|----------|---------|---------|
| `/health` | Liveness: is the process running? | Docker `HEALTHCHECK`, Render, uptime monitors |
| `/health/ready` | Readiness: should traffic be routed here? | Load balancers, orchestrators |
| `/health/detail` | Diagnostics: CPU count, load average, RSS and heap usage | Manual debugging, dashboards |
| `/metrics` | Prometheus scrape target | Prometheus |

Keeping liveness and readiness separate matters: `/health` should report
failure only if the process itself is broken, otherwise a slow dependency
causes an orchestrator to kill and restart healthy pods.

```powershell
Invoke-RestMethod http://localhost:3000/health
Invoke-RestMethod http://localhost:3000/health/ready
Invoke-RestMethod http://localhost:3000/health/detail
```

### Docker health check

The `Dockerfile` already declares one:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1
```

Check the result:

```powershell
docker inspect --format '{{.State.Health.Status}}' module5-api
```

Expected output once the container has settled: `healthy`.

---

## 2. Structured logging

`src/logger.js` writes one JSON object per line, which is the format Docker,
Kubernetes, Loki, CloudWatch and most collectors can parse without extra
configuration.

```json
{"timestamp":"2026-01-15T10:23:45.123Z","level":"info","service":"devops-module5-api","message":"http.request","method":"GET","path":"/health","route":"/health","status":200,"durationMs":1.482}
{"timestamp":"2026-01-15T10:23:46.001Z","level":"error","service":"devops-module5-api","message":"unhandled.error","errorName":"TypeError","errorMessage":"...","stack":"..."}
```

| Field | Purpose |
|-------|---------|
| `timestamp` | ISO 8601 UTC, sortable and timezone-safe |
| `level` | `debug` / `info` / `warn` / `error` |
| `service` | service name, so logs from several containers can be merged |
| `message` | short event name, greppable |
| extra fields | request metadata or serialised error details |

Set the verbosity with `LOG_LEVEL`:

```yaml
environment:
  LOG_LEVEL: debug    # debug | info | warn | error | silent
```

### Reading the logs

```powershell
# Follow all logs
docker compose logs -f api

# Last 50 lines
docker compose logs --tail 50 api

# Only errors
docker compose logs api | Select-String '"level":"error"'

# Follow inside a single container
docker logs -f module5-api
```

### Persist logs to disk

Add a logging driver in `docker-compose.yml`:

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Or write straight to a file:

```powershell
docker compose logs --no-color api > api.log
```

### Ship logs off the machine

```powershell
# Elasticsearch
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.15.0

# Grafana Loki (lighter alternative)
docker run -d --name loki -p 3100:3100 -v ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml grafana/loki:3.0.0
```

---

## 3. Metrics (Prometheus)

`src/metrics.js` uses `prom-client` with the `api_` prefix.

**Custom metrics**

| Metric | Type | Labels | Meaning |
|--------|------|--------|---------|
| `api_http_requests_total` | Counter | `method`, `route`, `status_code` | total requests |
| `api_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | latency distribution |
| `api_process_resident_memory_bytes` | Gauge | – | process RSS |
| `api_nodejs_heap_size_used_bytes` | Gauge | – | V8 heap in use |
| `api_nodejs_eventloop_lag_seconds` | Gauge | – | event loop responsiveness |
| `api_process_cpu_seconds_total` | Counter | – | CPU time consumed |

The histogram buckets (5 ms → 5 s) are what make p95/p99 latency possible;
without buckets Prometheus can only average.

### Scrape config

`monitoring/prometheus/prometheus.yml` already targets the API:

```yaml
scrape_configs:
  - job_name: 'module5-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['api:3000']
        labels:
          service: 'devops-module5-api'
```

The target is the **service name** `api:3000`, not `localhost`, because all
three containers share the `module5-net` bridge network.

```powershell
docker compose up -d --build
docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/targets
```

Check the `module5-api` target shows `up = 1`.

### Useful PromQL queries

Open <http://localhost:9090/graph> and try:

```promql
# Requests per second
sum(rate(api_http_requests_total[5m]))

# 5xx error ratio
sum(rate(api_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(api_http_requests_total[5m]))

# p95 latency
histogram_quantile(0.95, sum(rate(api_http_request_duration_seconds_bucket[5m])) by (le))

# Traffic per route
sum by (route) (rate(api_http_requests_total[5m]))

# Memory in MB
api_process_resident_memory_bytes / 1024 / 1024

# Event loop lag (healthy is well under 0.1)
api_nodejs_eventloop_lag_seconds
```

---

## 4. Dashboards (Grafana)

```powershell
docker compose up -d
```

1. Open <http://localhost:3001> and sign in with `admin` / `admin`
2. Go to **Dashboards → Module 5 - DevOps API Dashboard**

The dashboard is provisioned from
`monitoring/grafana/dashboards/api-dashboard.json`, so it loads automatically
with no manual import.

Panels:

| Panel | Metric | Why it matters |
|-------|--------|----------------|
| API Status | `up` | 1 = healthy, 0 = down |
| Request Rate | `rate(api_http_requests_total[5m])` | traffic trend |
| 5xx Error Ratio | error rate ÷ total rate | SLO health |
| Latency p50 / p95 | `histogram_quantile` | user experience |
| Requests by Route | grouped by `route` | finds hot paths |
| Response Codes | grouped by `status_code` | spots 4xx/5xx spikes |
| Memory Usage | RSS + heap | leak detection |
| Process CPU | `api_process_cpu_seconds_total` | saturation |

### Generating data

Dashboards are empty until traffic arrives. Use the bundled script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\load-test.ps1 -Requests 500
```

Or manually:

```powershell
1..100 | ForEach-Object {
  Invoke-WebRequest http://localhost:3000/api/items -UseBasicParsing | Out-Null
  Start-Sleep -Milliseconds 50
}
```

---

## 5. Alerting

A minimal Prometheus alerting rule set is already provided at
`monitoring/prometheus/alerts.yml` and is loaded by `prometheus.yml` via
`rule_files`. It contains:

```yaml
groups:
  - name: module5-api
    rules:
      - alert: ApiDown
        expr: up{job="module5-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Module 5 API is not responding"

      - alert: HighErrorRate
        expr: |
          sum(rate(api_http_requests_total{status_code=~"5.."}[5m]))
          / sum(rate(api_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "More than 5% of requests are failing"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(api_http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "p95 latency above 1 second"

      - alert: HighMemoryUsage
        expr: api_process_resident_memory_bytes > 400000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API memory usage above 400 MB"
```

The file also includes an `EventLoopLag` alert for blocked event loops.

View the loaded rules at <http://localhost:9090/alerts>, or
<http://localhost:3001/alerting/list> in Grafana.

Attach an alertmanager receiver (Slack, email, PagerDuty) to actually notify
anyone. Grafana also has a simpler built-in alert path under
**Alerting → Alert rules**, which is quicker for a module submission.

---

## 6. Deploy-time verification

The `cd.yml` workflow polls the live `/health` endpoint after deploying, so a
bad release fails the pipeline instead of passing silently:

```bash
for i in $(seq 1 30); do
  curl -fsS https://devops-module5-api.onrender.com/health && break
  sleep 10
done
```

A quick uptime check you can also run from your own machine:

```powershell
# Runs 20 times, one every 2 seconds
1..20 | ForEach-Object {
  $r = Invoke-WebRequest http://localhost:3000/health -UseBasicParsing
  "{0}  {1}  {2}ms" -f (Get-Date -Format "HH:mm:ss"), $r.StatusCode, $r.RawContentLength
  Start-Sleep -Seconds 2
}
```

---

## 7. Summary

| Concern | Tool | Where |
|---------|------|-------|
| Liveness / readiness | `/health`, `/health/ready` | `src/routes/health.js` |
| Logs | Custom JSON logger | `src/logger.js` |
| Metrics | `prom-client` | `src/metrics.js` |
| Metric storage / querying | Prometheus | `monitoring/prometheus/` |
| Visualisation | Grafana | `monitoring/grafana/` |
| Alerting | Prometheus rules / Grafana | `monitoring/prometheus/alerts.yml` |
| Orchestration | Docker Compose | `docker-compose.yml` |
