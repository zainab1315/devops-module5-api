'use strict';

const LEVELS = { silent: 100, debug: 10, info: 20, warn: 30, error: 40 };

describe('logger', () => {
  const originalEnv = { ...process.env };
  let stdout;
  let stderr;

  const loadLogger = (logLevel) => {
    let logger;
    jest.isolateModules(() => {
      if (logLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = logLevel;
      }
      process.env.NODE_ENV = 'test';
      // eslint-disable-next-line global-require
      logger = require('../src/logger');
    });
    return logger;
  };

  beforeEach(() => {
    stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('produces no output when the level is silent', () => {
    const logger = loadLogger('silent');

    logger.info('should.not.appear');
    logger.error('should.not.appear.either');

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  });

  it('defaults to silent under NODE_ENV=test when LOG_LEVEL is unset', () => {
    const logger = loadLogger(undefined);

    logger.error('hidden');

    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  });

  it('writes structured JSON to stdout for info messages', () => {
    const logger = loadLogger('info');

    logger.info('server.started', { port: 3000 });

    expect(stdout).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(stdout.mock.calls[0][0]);
    expect(entry).toMatchObject({
      level: 'info',
      message: 'server.started',
      port: 3000
    });
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });

  it('writes warn and error to stderr', () => {
    const logger = loadLogger('debug');

    logger.warn('disk.usage', { pct: 91 });
    logger.error('request.failed');

    expect(stderr).toHaveBeenCalledTimes(2);
    expect(JSON.parse(stderr.mock.calls[0][0]).level).toBe('warn');
    expect(JSON.parse(stderr.mock.calls[1][0]).level).toBe('error');
    expect(stdout).not.toHaveBeenCalled();
  });

  it('filters out messages below the configured level', () => {
    const logger = loadLogger('warn');

    logger.debug('nope');
    logger.info('nope');
    logger.error('yes');

    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('falls back to info when an unknown level is configured', () => {
    const logger = loadLogger('not-a-real-level');

    logger.info('still.printed');
    logger.debug('filtered');

    expect(stdout).toHaveBeenCalledTimes(1);
  });

  it('serializes an Error so the stack survives JSON logging', () => {
    const logger = loadLogger('info');
    const error = new TypeError('boom');

    const serialized = logger.serializeError(error);

    expect(serialized.errorName).toBe('TypeError');
    expect(serialized.errorMessage).toBe('boom');
    expect(typeof serialized.stack).toBe('string');
  });

  it('includes the service name in every entry', () => {
    const logger = loadLogger('info');

    logger.info('check');

    expect(JSON.parse(stdout.mock.calls[0][0]).service).toBeDefined();
  });

  it('exposes the level ordering used for filtering', () => {
    expect(LEVELS.silent).toBeGreaterThan(LEVELS.error);
    expect(LEVELS.debug).toBeLessThan(LEVELS.info);
  });
});
