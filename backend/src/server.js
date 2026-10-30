const express = require('express');
const cors = require('cors');
const {
  execute,
  getConnection,
  getPublicDatabaseConfig,
  initializeDatabase,
  query,
} = require('./db');
const { calculatePoints, canEditPrediction, normalizeMatchTime, validateScoreValue } = require('./utils');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function mapPartida(partida) {
  return {
    id: partida.id,
    data: partida.data,
    hora: normalizeMatchTime(partida.hora),
    mandante: partida.mandante,
    visitante: partida.visitante,
    placarMandante: partida.placar_mandante,
    placarVisitante: partida.placar_visitante,
  };
}

function mapPalpite(palpite) {
  return {
    id: palpite.id,
    idApostador: palpite.id_apostador,
    idPartida: palpite.id_partida,
    apostadorNome: palpite.apostador_nome,
    palpiteMandante: palpite.palpite_mandante,
    palpiteVisitante: palpite.palpite_visitante,
    pontuacao: palpite.pontuacao,
  };
}

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    await query('SELECT 1');
    res.json({ ok: true, database: getPublicDatabaseConfig() });
  })
);

app.get(
  '/api/apostadores',
  asyncHandler(async (_req, res) => {
    const apostadores = await query('SELECT id, nome FROM apostadores ORDER BY nome ASC');
    res.json(apostadores);
  })
);

app.post(
  '/api/apostadores',
  asyncHandler(async (req, res) => {
    const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';

    if (!nome) {
      return res.status(400).json({ message: 'Informe o nome do apostador.' });
    }

    const result = await execute('INSERT INTO apostadores (nome) VALUES (?)', [nome]);
    const apostadores = await query('SELECT id, nome FROM apostadores WHERE id = ?', [result.insertId]);

    return res.status(201).json(apostadores[0]);
  })
);

app.get(
  '/api/partidas/abertas',
  asyncHandler(async (_req, res) => {
    const partidas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        WHERE placar_mandante IS NULL AND placar_visitante IS NULL
        ORDER BY data ASC, hora ASC, id ASC
      `
    );

    const palpites = await query(
      `
        SELECT
          p.id,
          p.id_partida,
          p.id_apostador,
          a.nome AS apostador_nome,
          p.palpite_mandante,
          p.palpite_visitante,
          p.pontuacao
        FROM palpites p
        INNER JOIN apostadores a ON a.id = p.id_apostador
        INNER JOIN partidas pt ON pt.id = p.id_partida
        WHERE pt.placar_mandante IS NULL AND pt.placar_visitante IS NULL
        ORDER BY a.nome ASC
      `
    );

    const palpitesPorPartida = new Map();

    for (const palpite of palpites) {
      const existentes = palpitesPorPartida.get(palpite.id_partida) || [];
      existentes.push({
        id: palpite.id,
        idApostador: palpite.id_apostador,
        apostadorNome: palpite.apostador_nome,
        palpiteMandante: palpite.palpite_mandante,
        palpiteVisitante: palpite.palpite_visitante,
        pontuacao: palpite.pontuacao,
      });
      palpitesPorPartida.set(palpite.id_partida, existentes);
    }

    const payload = partidas.map((partida) => ({
      ...mapPartida(partida),
      palpites: palpitesPorPartida.get(partida.id) || [],
    }));

    res.json(payload);
  })
);

app.get(
  '/api/partidas',
  asyncHandler(async (_req, res) => {
    const partidas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        ORDER BY data ASC, hora ASC, id ASC
      `
    );

    res.json(partidas.map(mapPartida));
  })
);

app.post(
  '/api/partidas',
  asyncHandler(async (req, res) => {
    const data = typeof req.body.data === 'string' ? req.body.data.trim() : '';
    const hora = typeof req.body.hora === 'string' ? req.body.hora.trim() : '';
    const mandante = typeof req.body.mandante === 'string' ? req.body.mandante.trim() : '';
    const visitante = typeof req.body.visitante === 'string' ? req.body.visitante.trim() : '';

    if (!data || !hora || !mandante || !visitante) {
      return res.status(400).json({ message: 'Preencha data, hora, mandante e visitante.' });
    }

    const result = await execute(
      `
        INSERT INTO partidas (data, hora, mandante, visitante, placar_mandante, placar_visitante)
        VALUES (?, ?, ?, ?, NULL, NULL)
      `,
      [data, hora, mandante, visitante]
    );

    const partidas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json(mapPartida(partidas[0]));
  })
);

app.get(
  '/api/partidas/:id/palpites',
  asyncHandler(async (req, res) => {
    const partidaId = Number(req.params.id);

    if (!Number.isInteger(partidaId)) {
      return res.status(400).json({ message: 'Identificador de partida invalido.' });
    }

    const partidas = await query('SELECT id FROM partidas WHERE id = ?', [partidaId]);

    if (partidas.length === 0) {
      return res.status(404).json({ message: 'Partida nao encontrada.' });
    }

    const palpites = await query(
      `
        SELECT
          p.id,
          p.id_apostador,
          a.nome AS apostador_nome,
          p.id_partida,
          p.palpite_mandante,
          p.palpite_visitante,
          p.pontuacao
        FROM palpites p
        INNER JOIN apostadores a ON a.id = p.id_apostador
        WHERE p.id_partida = ?
        ORDER BY a.nome ASC
      `,
      [partidaId]
    );

    return res.json(palpites.map(mapPalpite));
  })
);

app.post(
  '/api/palpites',
  asyncHandler(async (req, res) => {
    const idApostador = Number(req.body.idApostador);
    const idPartida = Number(req.body.idPartida);
    const palpiteMandante = Number(req.body.palpiteMandante);
    const palpiteVisitante = Number(req.body.palpiteVisitante);

    if (!Number.isInteger(idApostador) || !Number.isInteger(idPartida)) {
      return res.status(400).json({ message: 'Apostador e partida sao obrigatorios.' });
    }

    if (!validateScoreValue(palpiteMandante) || !validateScoreValue(palpiteVisitante)) {
      return res.status(400).json({ message: 'Informe palpites validos para o placar.' });
    }

    const apostadores = await query('SELECT id, nome FROM apostadores WHERE id = ?', [idApostador]);
    const partidas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        WHERE id = ?
      `,
      [idPartida]
    );

    const apostador = apostadores[0];
    const partida = partidas[0];

    if (!apostador) {
      return res.status(404).json({ message: 'Apostador nao encontrado.' });
    }

    if (!partida) {
      return res.status(404).json({ message: 'Partida nao encontrada.' });
    }

    if (!canEditPrediction(partida)) {
      return res.status(409).json({ message: 'O prazo para palpites dessa partida ja foi encerrado.' });
    }

    if (partida.placar_mandante !== null || partida.placar_visitante !== null) {
      return res.status(409).json({ message: 'Nao e possivel palpitar em partida com resultado confirmado.' });
    }

    const existentes = await query('SELECT id FROM palpites WHERE id_apostador = ? AND id_partida = ?', [
      idApostador,
      idPartida,
    ]);
    const existing = existentes[0];

    if (existing) {
      await execute(
        `
          UPDATE palpites
          SET palpite_mandante = ?, palpite_visitante = ?, pontuacao = 0
          WHERE id = ?
        `,
        [palpiteMandante, palpiteVisitante, existing.id]
      );

      const updated = await query(
        `
          SELECT
            p.id,
            p.id_apostador,
            p.id_partida,
            a.nome AS apostador_nome,
            p.palpite_mandante,
            p.palpite_visitante,
            p.pontuacao
          FROM palpites p
          INNER JOIN apostadores a ON a.id = p.id_apostador
          WHERE p.id = ?
        `,
        [existing.id]
      );

      return res.json({
        message: 'Palpite atualizado com sucesso.',
        palpite: mapPalpite(updated[0]),
        wasUpdate: true,
      });
    }

    try {
      const result = await execute(
        `
          INSERT INTO palpites (id_apostador, id_partida, palpite_mandante, palpite_visitante, pontuacao)
          VALUES (?, ?, ?, ?, 0)
        `,
        [idApostador, idPartida, palpiteMandante, palpiteVisitante]
      );

      const created = await query(
        `
          SELECT
            p.id,
            p.id_apostador,
            p.id_partida,
            a.nome AS apostador_nome,
            p.palpite_mandante,
            p.palpite_visitante,
            p.pontuacao
          FROM palpites p
          INNER JOIN apostadores a ON a.id = p.id_apostador
          WHERE p.id = ?
        `,
        [result.insertId]
      );

      return res.status(201).json({
        message: 'Palpite registrado com sucesso.',
        palpite: mapPalpite(created[0]),
        wasUpdate: false,
      });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ja existe um palpite para esse apostador nessa partida.' });
      }

      return res.status(500).json({ message: 'Erro ao salvar palpite.' });
    }
  })
);

app.patch(
  '/api/partidas/:id/resultado',
  asyncHandler(async (req, res) => {
    const partidaId = Number(req.params.id);
    const placarMandante = Number(req.body.placarMandante);
    const placarVisitante = Number(req.body.placarVisitante);
    const confirmacao = req.body.confirmacao === true;

    if (!Number.isInteger(partidaId)) {
      return res.status(400).json({ message: 'Identificador de partida invalido.' });
    }

    if (!confirmacao) {
      return res.status(400).json({ message: 'Confirme o lancamento do resultado antes de salvar.' });
    }

    if (!validateScoreValue(placarMandante) || !validateScoreValue(placarVisitante)) {
      return res.status(400).json({ message: 'Informe um placar valido.' });
    }

    const partidas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        WHERE id = ?
      `,
      [partidaId]
    );
    const partida = partidas[0];

    if (!partida) {
      return res.status(404).json({ message: 'Partida nao encontrada.' });
    }

    if (partida.placar_mandante !== null || partida.placar_visitante !== null) {
      return res.status(409).json({ message: 'O resultado dessa partida ja foi confirmado e nao pode ser alterado.' });
    }

    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
          UPDATE partidas
          SET placar_mandante = ?, placar_visitante = ?
          WHERE id = ?
        `,
        [placarMandante, placarVisitante, partidaId]
      );

      const [palpites] = await connection.query(
        `
          SELECT id, palpite_mandante, palpite_visitante
          FROM palpites
          WHERE id_partida = ?
        `,
        [partidaId]
      );

      for (const palpite of palpites) {
        const pontos = calculatePoints(
          palpite.palpite_mandante,
          palpite.palpite_visitante,
          placarMandante,
          placarVisitante
        );

        await connection.execute('UPDATE palpites SET pontuacao = ? WHERE id = ?', [pontos, palpite.id]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const atualizadas = await query(
      `
        SELECT
          id,
          data,
          hora,
          mandante,
          visitante,
          placar_mandante,
          placar_visitante
        FROM partidas
        WHERE id = ?
      `,
      [partidaId]
    );

    return res.json({
      message: 'Resultado confirmado com sucesso.',
      partida: mapPartida(atualizadas[0]),
    });
  })
);

app.get(
  '/api/ranking',
  asyncHandler(async (_req, res) => {
    const ranking = await query(
      `
        SELECT
          a.id,
          a.nome,
          COALESCE(SUM(p.pontuacao), 0) AS pontos
        FROM apostadores a
        LEFT JOIN palpites p ON p.id_apostador = a.id
        GROUP BY a.id, a.nome
        ORDER BY pontos DESC, a.nome ASC
      `
    );

    res.json(ranking);
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.' });
});

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
