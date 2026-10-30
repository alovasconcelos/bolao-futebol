const { getPublicDatabaseConfig, initializeDatabase } = require('./db');
const { createApp } = require('./app');

const app = createApp();
const port = process.env.PORT || 3001;

async function startServer() {
  await initializeDatabase();

  app.listen(port, () => {
    const database = getPublicDatabaseConfig();
    console.log(`Servidor do bolao rodando em http://localhost:${port}`);
    console.log(
      `Banco MySQL em ${database.host}:${database.port}/${database.database} com usuario ${database.user}`
    );
  });
}

startServer().catch((error) => {
  console.error('Falha ao inicializar o backend:', error);
  process.exit(1);
});
