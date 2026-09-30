'use strict';

const config = require('./config');

// 'silent' suppresses all output, which is the default during tests.
const LEVELS = { silent: 100, debug: 10, info: 20, warn: 30, error: 40 };

const activeLevel = LEVELS[config.logLevel] !== undefined
  ? LEVELS[config.logLevel]
  : LEVELS.info;

const write = (level, message, meta = {}) => {
  if (LEVELS[level] < activeLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: config.serviceName,
    message,
    ...meta
  };

  const line = JSON.stringify(entry);

  if (level === 'error' || level === 'warn') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
};

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  /** Serialises an Error so the stack survives JSON logging. */
  serializeError: (error) => ({
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  })
};

module.exports = logger;
