#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionFilePath = path.resolve(__dirname, '..', 'version.json');

function formatBuildUTC(date) {
  const pad = (value) => String(value).padStart(2, '0');

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());

  return `${year}${month}${day}-${hour}${minute}`;
}

function readVersionFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeVersionFile(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function run() {
  const now = new Date();
  const current = readVersionFile(versionFilePath);

  const next = {
    ...current,
    build: formatBuildUTC(now),
    buildTimestamp: now.toISOString()
  };

  writeVersionFile(versionFilePath, next);
  console.log(`Version build updated: ${next.build} (${next.buildTimestamp})`);
}

run();
