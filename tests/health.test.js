'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'devops-module5-api'
    });
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptimeSeconds');
  });

  it('returns a parseable ISO timestamp', async () => {
    const res = await request(app).get('/health');

    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('exposes the uptime as a non-negative number', async () => {
    const res = await request(app).get('/health');

    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /health/ready', () => {
  it('returns 200 and reports ready', async () => {
    const res = await request(app).get('/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks).toHaveProperty('memory');
  });
});

describe('GET /health/detail', () => {
  it('returns system and memory diagnostics', async () => {
    const res = await request(app).get('/health/detail');

    expect(res.status).toBe(200);
    expect(res.body.system).toHaveProperty('platform');
    expect(res.body.system).toHaveProperty('nodeVersion');
    expect(res.body.memoryUsage.rssMB).toBeGreaterThan(0);
  });
});

describe('GET /metrics', () => {
  it('exposes Prometheus metrics in text format', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('api_http_requests_total');
  });
});
