'use strict';

const express = require('express');

const store = require('../store');
const logger = require('../logger');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ count: store.list().length, data: store.list() });
});

router.get('/:id', (req, res) => {
  const item = store.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Not Found', message: `Item ${req.params.id} not found` });
  }
  return res.status(200).json(item);
});

router.post('/', (req, res) => {
  const { name, status } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Bad Request', message: 'Field "name" is required' });
  }

  const item = store.create({ name: name.trim(), status });
  logger.info('item.created', { id: item.id, name: item.name });

  return res.status(201).json(item);
});

router.delete('/:id', (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: 'Not Found', message: `Item ${req.params.id} not found` });
  }
  logger.info('item.deleted', { id: req.params.id });
  return res.status(204).send();
});

module.exports = router;
