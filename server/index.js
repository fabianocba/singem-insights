/**
 * Entry point do servidor SINGEM.
 * Responsável apenas por iniciar o bootstrap.
 */

const { startServer } = require('./bootstrap');
const db = require('./db');

let shuttingDown = false;

async function shutdown(reason, error) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (error) {
    console.error(`[Process] ${reason}:`, error);
  } else {
    console.error(`[Process] ${reason}`);
  }

  try {
    await db.close();
  } catch (closeError) {
    console.error('[Process] Erro ao encerrar pool do PostgreSQL:', closeError);
  }

  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  shutdown('unhandledRejection', reason);
});

process.on('uncaughtException', (error) => {
  shutdown('uncaughtException', error);
});

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
