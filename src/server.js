'use strict';

const app = require('./app');
const config = require('./config');
const logger = require('./logger');

const server = app.listen(config.port, () => {
  logger.info('server.started', {
    port: config.port,
    env: config.env,
    version: config.version,
    pid: process.pid
  });
});

/** Graceful shutdown so containers are not SIGKILLed mid-request. */
const shutdown = (signal) => {
  logger.info('server.shutdown.signal', { signal });

  server.close(() => {
    logger.info('server.shutdown.complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('server.shutdown.timeout', { timeoutMs: config.shutdownTimeoutMs });
    process.exit(1);
  }, config.shutdownTimeoutMs).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled.rejection', { reason: String(reason) });
});

module.exports = server;
