const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '..', '..', 'version.json');

function normalizeVersion(data = {}) {
  return {
    name: String(data.name || process.env.APP_NAME || 'SINGEM'),
    version: String(data.version || process.env.APP_VERSION || '0.0.0'),
    channel: String(data.channel || process.env.APP_CHANNEL || 'dev'),
    build: String(data.build || process.env.APP_BUILD || 'local'),
    buildTimestamp: String(data.buildTimestamp || process.env.APP_BUILD_TS || new Date().toISOString())
  };
}

function readVersion() {
  try {
    const raw = fs.readFileSync(VERSION_FILE, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    return normalizeVersion(parsed);
  } catch {
    return normalizeVersion();
  }
}

module.exports = {
  readVersion
};
