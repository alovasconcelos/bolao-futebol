const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
const schemaPath = path.join(projectRoot, 'db', 'schema.sql');
const seedPath = path.join(projectRoot, 'db', 'seed.sql');

dotenv.config({ path: envPath, quiet: true });

function getRequiredEnv(name, fallback) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

const databaseConfig = {
  host: getRequiredEnv('DB_HOST', 'santostecnologia.com'),
  port: Number(getRequiredEnv('DB_PORT', '3306')),
  database: getRequiredEnv('DB_NAME', 'bolao-futebol'),
  user: getRequiredEnv('DB_USER', 'bolao_root'),
  password: getRequiredEnv('DB_PASSWORD'),
};

const poolConfig = {
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true,
  charset: 'utf8mb4',
};

let pool;

function escapeIdentifier(value) {
  return String(value).replace(/`/g, '``');
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }

  return pool;
}

async function runSqlFile(filePath, connection) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  await connection.query(sql);
}

async function ensureDatabaseExists() {
  const bootstrapConnection = await mysql.createConnection({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    charset: 'utf8mb4',
  });

  try {
    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${escapeIdentifier(databaseConfig.database)}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await bootstrapConnection.end();
  }
}

async function initializeDatabase() {
  await ensureDatabaseExists();
  await runSqlFile(schemaPath, getPool());
}

async function runSeed() {
  await runSqlFile(seedPath, getPool());
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function execute(sql, params = []) {
  const [result] = await getPool().execute(sql, params);
  return result;
}

async function getConnection() {
  return getPool().getConnection();
}

function getPublicDatabaseConfig() {
  return {
    client: 'mysql',
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
  };
}

module.exports = {
  databaseConfig,
  execute,
  getConnection,
  getPublicDatabaseConfig,
  initializeDatabase,
  query,
  runSeed,
};
