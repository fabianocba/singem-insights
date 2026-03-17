'use strict';

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRecord(record = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(record || {})) {
    normalized[normalizeHeader(key)] = typeof value === 'string' ? value.trim() : value;
  }
  return normalized;
}

module.exports = {
  normalizeHeader,
  normalizeRecord
};
