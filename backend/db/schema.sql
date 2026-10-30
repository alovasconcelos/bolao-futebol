CREATE TABLE IF NOT EXISTS apostadores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partidas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  mandante VARCHAR(255) NOT NULL,
  visitante VARCHAR(255) NOT NULL,
  placar_mandante INT NULL,
  placar_visitante INT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS palpites (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_apostador INT UNSIGNED NOT NULL,
  id_partida INT UNSIGNED NOT NULL,
  palpite_mandante INT NOT NULL,
  palpite_visitante INT NOT NULL,
  pontuacao INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_palpites_apostador FOREIGN KEY (id_apostador) REFERENCES apostadores(id),
  CONSTRAINT fk_palpites_partida FOREIGN KEY (id_partida) REFERENCES partidas(id),
  CONSTRAINT uq_palpites_apostador_partida UNIQUE (id_apostador, id_partida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
