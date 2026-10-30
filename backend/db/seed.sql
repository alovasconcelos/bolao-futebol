INSERT INTO apostadores (nome)
SELECT 'Ana'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM apostadores WHERE nome = 'Ana');

INSERT INTO apostadores (nome)
SELECT 'Bruno'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM apostadores WHERE nome = 'Bruno');

INSERT INTO apostadores (nome)
SELECT 'Carla'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM apostadores WHERE nome = 'Carla');

INSERT INTO apostadores (nome)
SELECT 'Diego'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM apostadores WHERE nome = 'Diego');

INSERT INTO partidas (data, hora, mandante, visitante, placar_mandante, placar_visitante)
SELECT '2026-10-30', '19:30', 'Flamengo', 'Palmeiras', NULL, NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM partidas
  WHERE data = '2026-10-30'
    AND hora = '19:30'
    AND mandante = 'Flamengo'
    AND visitante = 'Palmeiras'
);

INSERT INTO partidas (data, hora, mandante, visitante, placar_mandante, placar_visitante)
SELECT '2026-10-31', '16:00', 'Corinthians', 'Sao Paulo', NULL, NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM partidas
  WHERE data = '2026-10-31'
    AND hora = '16:00'
    AND mandante = 'Corinthians'
    AND visitante = 'Sao Paulo'
);

INSERT INTO partidas (data, hora, mandante, visitante, placar_mandante, placar_visitante)
SELECT '2026-11-01', '18:45', 'Internacional', 'Gremio', NULL, NULL
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM partidas
  WHERE data = '2026-11-01'
    AND hora = '18:45'
    AND mandante = 'Internacional'
    AND visitante = 'Gremio'
);
