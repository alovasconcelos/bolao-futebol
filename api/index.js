const { initializeDatabase } = require('../backend/src/db');
const { createApp } = require('../backend/src/app');

const app = createApp();
let initializationPromise;

function ensureInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase();
  }

  return initializationPromise;
}

module.exports = async (req, res) => {
  await ensureInitialized();
  return app(req, res);
};
