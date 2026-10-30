PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS apostadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  hora TEXT NOT NULL,
  mandante TEXT NOT NULL,
  visitante TEXT NOT NULL,
  placar_mandante INTEGER NULL,
  placar_visitante INTEGER NULL
);

CREATE TABLE IF NOT EXISTS palpites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_apostador INTEGER NOT NULL,
  id_partida INTEGER NOT NULL,
  palpite_mandante INTEGER NOT NULL,
  palpite_visitante INTEGER NOT NULL,
  pontuacao INTEGER DEFAULT 0,
  FOREIGN KEY (id_apostador) REFERENCES apostadores(id),
  FOREIGN KEY (id_partida) REFERENCES partidas(id),
  UNIQUE (id_apostador, id_partida)
);
