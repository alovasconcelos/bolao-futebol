const { getPublicDatabaseConfig, initializeDatabase, runSeed } = require('./db');

async function applySeed() {
  await initializeDatabase();
  await runSeed();

  const database = getPublicDatabaseConfig();
  console.log(`Seed aplicado com sucesso em ${database.host}:${database.port}/${database.database}`);
}

applySeed().catch((error) => {
  console.error('Falha ao aplicar seed:', error);
  process.exit(1);
});
