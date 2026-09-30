'use strict';

const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

beforeEach(() => {
  store.reset();
});

describe('Items API', () => {
  describe('GET /api/items', () => {
    it('returns the seeded items', async () => {
      const res = await request(app).get('/api/items');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.data).toHaveLength(3);
    });

    it('returns a list of objects with id, name and status', async () => {
      const res = await request(app).get('/api/items');

      res.body.data.forEach((item) => {
        expect(item).toEqual({
          id: expect.any(String),
          name: expect.any(String),
          status: expect.any(String)
        });
      });
    });
  });

  describe('GET /api/items/:id', () => {
    it('returns a single item when the id exists', async () => {
      const res = await request(app).get('/api/items/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('1');
      expect(res.body.name).toBe('Deploy Pipeline');
    });

    it('returns 404 when the id does not exist', async () => {
      const res = await request(app).get('/api/items/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not Found');
    });
  });

  describe('POST /api/items', () => {
    it('creates an item and returns 201', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'New Task', status: 'active' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        name: 'New Task',
        status: 'active'
      });
    });

    it('defaults status to pending when omitted', async () => {
      const res = await request(app).post('/api/items').send({ name: 'Default Task' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('trims whitespace from the name', async () => {
      const res = await request(app).post('/api/items').send({ name: '   Padded   ' });

      expect(res.body.name).toBe('Padded');
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/api/items').send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name/i);
    });

    it('returns 400 when name is an empty string', async () => {
      const res = await request(app).post('/api/items').send({ name: '   ' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is not a string', async () => {
      const res = await request(app).post('/api/items').send({ name: 42 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('deletes an existing item and returns 204', async () => {
      const res = await request(app).delete('/api/items/2');

      expect(res.status).toBe(204);
      expect(store.list()).toHaveLength(2);
    });

    it('returns 404 when deleting a missing item', async () => {
      const res = await request(app).delete('/api/items/nope');

      expect(res.status).toBe(404);
    });

    it('actually removes the item from the collection', async () => {
      await request(app).delete('/api/items/1');
      const res = await request(app).get('/api/items/1');

      expect(res.status).toBe(404);
    });
  });
});

describe('store module', () => {
  it('reset restores the seed data', () => {
    store.create({ name: 'Temp' });
    expect(store.list()).toHaveLength(4);

    store.reset();
    expect(store.list()).toHaveLength(3);
  });

  it('remove returns false for an unknown id', () => {
    expect(store.remove('unknown')).toBe(false);
  });

  it('findById returns null for an unknown id', () => {
    expect(store.findById('unknown')).toBeNull();
  });
});
