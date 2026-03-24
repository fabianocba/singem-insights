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

function bumpSemver(version, channel) {
  const match = String(version || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return '0.1.0';
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (channel === 'main') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function writeVersionFile(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function run() {
  const now = new Date();
  const current = readVersionFile(versionFilePath);
  const channel = String(current.channel || 'dev').toLowerCase();

  const next = {
    ...current,
    version: bumpSemver(current.version, channel),
    build: formatBuildUTC(now),
    buildTimestamp: now.toISOString()
  };

  writeVersionFile(versionFilePath, next);
  console.log(`Version build updated: ${next.build} (${next.buildTimestamp})`);
}

run();
