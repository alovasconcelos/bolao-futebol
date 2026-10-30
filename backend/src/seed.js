const { initializeDatabase, runSeed, databasePath } = require('./db');

initializeDatabase();
runSeed();

console.log(`Seed aplicado com sucesso em ${databasePath}`);
