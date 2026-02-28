/**
 * Entry point do servidor SINGEM.
 * Responsável apenas por iniciar o bootstrap.
 */

const { startServer } = require('./bootstrap');

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
