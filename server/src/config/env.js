const { config } = require('../../config');

function loadEnv() {
  return {
    nodeEnv: config.env,
    port: config.port,
    corsOrigins: config.corsOrigins,
    trustProxy: config.trustProxy
  };
}

module.exports = {
  loadEnv
};
