'use strict';

const express = require('express');
const os = require('os');

const config = require('../config');
const metrics = require('../metrics');

const router = express.Router();
const startedAt = Date.now();

/**
 * Liveness probe - is the process alive?
 * Used by Docker HEALTHCHECK and by Render/Railway.
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: config.serviceName,
    version: config.version,
    env: config.env,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe - is the process ready to serve traffic?
 * Verified separately from /health so orchestrators can tell the two apart.
 */
router.get('/health/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    checks: {
      database: 'not-configured',
      memory: 'ok'
    },
    startedAt: new Date(startedAt).toISOString()
  });
});

/**
 * Deep health check - includes system resource details for the monitoring demo.
 */
router.get('/health/detail', (req, res) => {
  const memory = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    service: config.serviceName,
    version: config.version,
    uptimeSeconds: Math.floor(process.uptime()),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      loadAverage: os.loadavg(),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024)
    },
    memoryUsage: {
      rssMB: Math.round(memory.rss / 1024 / 1024),
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

/** Prometheus scrape target. */
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.registry.contentType);
  res.send(await metrics.registry.metrics());
});

module.exports = router;
