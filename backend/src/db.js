const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const databasePath = path.join(dataDir, 'apostas.db');
const schemaPath = path.join(projectRoot, 'db', 'schema.sql');
const seedPath = path.join(projectRoot, 'db', 'seed.sql');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function createConnection() {
  ensureDataDir();

  const db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  return db;
}

const db = createConnection();

function runSchema() {
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);
}

function runSeed() {
  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  db.exec(seedSql);
}

function initializeDatabase() {
  runSchema();
}

module.exports = {
  db,
  databasePath,
  initializeDatabase,
  runSeed,
};
