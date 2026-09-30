'use strict';

const client = require('prom-client');

client.collectDefaultMetrics({
  prefix: 'api_',
  labels: { service: process.env.SERVICE_NAME || 'devops-module5-api' }
});

const httpRequestDuration = new client.Histogram({
  name: 'api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const recordRequest = (method, route, statusCode, durationSeconds) => {
  const labels = {
    method,
    route,
    status_code: String(statusCode)
  };
  httpRequestDuration.observe(labels, durationSeconds);
  httpRequestsTotal.inc(labels);
};

module.exports = {
  client,
  registry: client.register,
  recordRequest
};
