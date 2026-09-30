'use strict';

const crypto = require('crypto');

/**
 * In-memory data store. Deliberately dependency free so the app can boot in
 * a container with no external service required.
 */
const seed = [
  { id: '1', name: 'Deploy Pipeline', status: 'active' },
  { id: '2', name: 'Health Endpoint', status: 'active' },
  { id: '3', name: 'Metrics Exporter', status: 'active' }
];

let items = seed.map((item) => ({ ...item }));

const list = () => items.map((item) => ({ ...item }));

const findById = (id) => {
  const item = items.find((entry) => entry.id === id);
  return item ? { ...item } : null;
};

const create = ({ name, status = 'pending' }) => {
  const item = {
    id: crypto.randomUUID(),
    name,
    status
  };
  items.push(item);
  return { ...item };
};

const remove = (id) => {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  return true;
};

const reset = () => {
  items = seed.map((item) => ({ ...item }));
};

module.exports = { list, findById, create, remove, reset };
