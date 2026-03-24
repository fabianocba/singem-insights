const { config } = require('../../config');

function dbConfig() {
  return {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    max: config.db.max,
    idleTimeoutMillis: config.db.idleTimeoutMillis,
    connectionTimeoutMillis: config.db.connectionTimeoutMillis
  };
}

module.exports = {
  dbConfig
};
