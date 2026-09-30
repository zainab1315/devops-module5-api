'use strict';

require('dotenv').config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  version: process.env.APP_VERSION || '1.0.0',
  // Tests stay quiet by default; any explicit LOG_LEVEL overrides that.
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  serviceName: process.env.SERVICE_NAME || 'devops-module5-api',
  shutdownTimeoutMs: toInt(process.env.SHUTDOWN_TIMEOUT_MS, 10000)
};

module.exports = config;
