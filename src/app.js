'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const config = require('./config');
const logger = require('./logger');
const metrics = require('./metrics');
const healthRoutes = require('./routes/health');
const itemRoutes = require('./routes/items');
const store = require('./store');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// Request logging + Prometheus instrumentation middleware.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    // req.route is undefined for 404s, so fall back to the raw path.
    const route = (req.route && req.route.path) ? req.baseUrl + req.route.path : 'unmatched';
    metrics.recordRequest(req.method, route, res.statusCode, durationSeconds);
    logger.info('http.request', {
      method: req.method,
      path: req.originalUrl,
      route,
      status: res.statusCode,
      durationMs: Number(durationSeconds.toFixed(3))
    });
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: config.serviceName,
    version: config.version,
    message: 'DevOps Module 5 REST API is running',
    endpoints: {
      health: '/health',
      ready: '/health/ready',
      healthDetail: '/health/detail',
      metrics: '/metrics',
      items: '/api/items'
    }
  });
});

// health.js declares absolute paths (/health, /health/ready, /metrics),
// so it is mounted at the root rather than at /health.
app.use(healthRoutes);
app.use('/api/items', itemRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} does not exist` });
});

// Centralised error handler
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  logger.error('unhandled.error', logger.serializeError(error));
  res.status(error.status || 500).json({
    error: 'Internal Server Error',
    message: config.env === 'production' ? 'Something went wrong' : error.message
  });
});

module.exports = app;
module.exports.resetStore = store.reset;
