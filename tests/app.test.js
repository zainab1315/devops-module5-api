'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('Root and error handling', () => {
  it('GET / returns service metadata and endpoint list', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.service).toBe('devops-module5-api');
    expect(res.body.endpoints).toMatchObject({
      health: '/health',
      metrics: '/metrics',
      items: '/api/items'
    });
  });

  it('GET /unknown returns 404 JSON', async () => {
    const res = await request(app).get('/unknown');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toMatch(/unknown/i);
  });

  it('sets the helmet security headers', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('enables CORS so the health check can be called from anywhere', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://example.com');

    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
