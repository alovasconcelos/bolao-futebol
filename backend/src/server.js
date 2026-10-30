const express = require('express');
const cors = require('cors');
const { db, initializeDatabase, databasePath } = require('./db');
const { calculatePoints, canEditPrediction, validateScoreValue } = require('./utils');

initializeDatabase();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, databasePath });
});

app.get('/api/apostadores', (_req, res) => {
  const apostadores = db
    .prepare('SELECT id, nome FROM apostadores ORDER BY nome COLLATE NOCASE ASC')
    .all();

  res.json(apostadores);
});

app.post('/api/apostadores', (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';

  if (!nome) {
    return res.status(400).json({ message: 'Informe o nome do apostador.' });
  }

  const result = db.prepare('INSERT INTO apostadores (nome) VALUES (?)').run(nome);
  const apostador = db.prepare('SELECT id, nome FROM apostadores WHERE id = ?').get(result.lastInsertRowid);

  return res.status(201).json(apostador);
});

app.get('/api/partidas/abertas', (_req, res) => {
  const partidas = db
    .prepare(`
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
    `)
    .all();

  const palpites = db
    .prepare(`
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
      ORDER BY a.nome COLLATE NOCASE ASC
    `)
    .all();

  const palpitesPorPartida = new Map();

  for (const palpite of palpites) {
    const existing = palpitesPorPartida.get(palpite.id_partida) || [];
    existing.push({
      id: palpite.id,
      idApostador: palpite.id_apostador,
      apostadorNome: palpite.apostador_nome,
      palpiteMandante: palpite.palpite_mandante,
      palpiteVisitante: palpite.palpite_visitante,
      pontuacao: palpite.pontuacao,
    });
    palpitesPorPartida.set(palpite.id_partida, existing);
  }

  const payload = partidas.map((partida) => ({
    id: partida.id,
    data: partida.data,
    hora: partida.hora,
    mandante: partida.mandante,
    visitante: partida.visitante,
    placarMandante: partida.placar_mandante,
    placarVisitante: partida.placar_visitante,
    palpites: palpitesPorPartida.get(partida.id) || [],
  }));

  res.json(payload);
});

app.get('/api/partidas', (_req, res) => {
  const partidas = db
    .prepare(`
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
    `)
    .all()
    .map((partida) => ({
      id: partida.id,
      data: partida.data,
      hora: partida.hora,
      mandante: partida.mandante,
      visitante: partida.visitante,
      placarMandante: partida.placar_mandante,
      placarVisitante: partida.placar_visitante,
    }));

  res.json(partidas);
});

app.post('/api/partidas', (req, res) => {
  const data = typeof req.body.data === 'string' ? req.body.data.trim() : '';
  const hora = typeof req.body.hora === 'string' ? req.body.hora.trim() : '';
  const mandante = typeof req.body.mandante === 'string' ? req.body.mandante.trim() : '';
  const visitante = typeof req.body.visitante === 'string' ? req.body.visitante.trim() : '';

  if (!data || !hora || !mandante || !visitante) {
    return res.status(400).json({ message: 'Preencha data, hora, mandante e visitante.' });
  }

  const result = db
    .prepare(`
      INSERT INTO partidas (data, hora, mandante, visitante, placar_mandante, placar_visitante)
      VALUES (?, ?, ?, ?, NULL, NULL)
    `)
    .run(data, hora, mandante, visitante);

  const partida = db
    .prepare(`
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
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({
    id: partida.id,
    data: partida.data,
    hora: partida.hora,
    mandante: partida.mandante,
    visitante: partida.visitante,
    placarMandante: partida.placar_mandante,
    placarVisitante: partida.placar_visitante,
  });
});

app.get('/api/partidas/:id/palpites', (req, res) => {
  const partidaId = Number(req.params.id);

  if (!Number.isInteger(partidaId)) {
    return res.status(400).json({ message: 'Identificador de partida invalido.' });
  }

  const partida = db.prepare('SELECT id FROM partidas WHERE id = ?').get(partidaId);

  if (!partida) {
    return res.status(404).json({ message: 'Partida nao encontrada.' });
  }

  const palpites = db
    .prepare(`
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
      ORDER BY a.nome COLLATE NOCASE ASC
    `)
    .all(partidaId)
    .map((palpite) => ({
      id: palpite.id,
      idApostador: palpite.id_apostador,
      idPartida: palpite.id_partida,
      apostadorNome: palpite.apostador_nome,
      palpiteMandante: palpite.palpite_mandante,
      palpiteVisitante: palpite.palpite_visitante,
      pontuacao: palpite.pontuacao,
    }));

  return res.json(palpites);
});

app.post('/api/palpites', (req, res) => {
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

  const apostador = db.prepare('SELECT id, nome FROM apostadores WHERE id = ?').get(idApostador);
  const partida = db
    .prepare(`
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
    `)
    .get(idPartida);

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

  const existing = db
    .prepare('SELECT id FROM palpites WHERE id_apostador = ? AND id_partida = ?')
    .get(idApostador, idPartida);

  if (existing) {
    db.prepare(`
      UPDATE palpites
      SET palpite_mandante = ?, palpite_visitante = ?, pontuacao = 0
      WHERE id = ?
    `).run(palpiteMandante, palpiteVisitante, existing.id);

    const updated = db
      .prepare(`
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
      `)
      .get(existing.id);

    return res.json({
      message: 'Palpite atualizado com sucesso.',
      palpite: {
        id: updated.id,
        idApostador: updated.id_apostador,
        idPartida: updated.id_partida,
        apostadorNome: updated.apostador_nome,
        palpiteMandante: updated.palpite_mandante,
        palpiteVisitante: updated.palpite_visitante,
        pontuacao: updated.pontuacao,
      },
      wasUpdate: true,
    });
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO palpites (id_apostador, id_partida, palpite_mandante, palpite_visitante, pontuacao)
        VALUES (?, ?, ?, ?, 0)
      `)
      .run(idApostador, idPartida, palpiteMandante, palpiteVisitante);

    const created = db
      .prepare(`
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
      `)
      .get(result.lastInsertRowid);

    return res.status(201).json({
      message: 'Palpite registrado com sucesso.',
      palpite: {
        id: created.id,
        idApostador: created.id_apostador,
        idPartida: created.id_partida,
        apostadorNome: created.apostador_nome,
        palpiteMandante: created.palpite_mandante,
        palpiteVisitante: created.palpite_visitante,
        pontuacao: created.pontuacao,
      },
      wasUpdate: false,
    });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ message: 'Ja existe um palpite para esse apostador nessa partida.' });
    }

    return res.status(500).json({ message: 'Erro ao salvar palpite.' });
  }
});

app.patch('/api/partidas/:id/resultado', (req, res) => {
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

  const partida = db
    .prepare(`
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
    `)
    .get(partidaId);

  if (!partida) {
    return res.status(404).json({ message: 'Partida nao encontrada.' });
  }

  if (partida.placar_mandante !== null || partida.placar_visitante !== null) {
    return res.status(409).json({ message: 'O resultado dessa partida ja foi confirmado e nao pode ser alterado.' });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE partidas
      SET placar_mandante = ?, placar_visitante = ?
      WHERE id = ?
    `).run(placarMandante, placarVisitante, partidaId);

    const palpites = db
      .prepare(`
        SELECT id, palpite_mandante, palpite_visitante
        FROM palpites
        WHERE id_partida = ?
      `)
      .all(partidaId);

    const updatePoints = db.prepare('UPDATE palpites SET pontuacao = ? WHERE id = ?');

    for (const palpite of palpites) {
      const pontos = calculatePoints(
        palpite.palpite_mandante,
        palpite.palpite_visitante,
        placarMandante,
        placarVisitante
      );

      updatePoints.run(pontos, palpite.id);
    }
  });

  transaction();

  const partidaAtualizada = db
    .prepare(`
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
    `)
    .get(partidaId);

  return res.json({
    message: 'Resultado confirmado com sucesso.',
    partida: {
      id: partidaAtualizada.id,
      data: partidaAtualizada.data,
      hora: partidaAtualizada.hora,
      mandante: partidaAtualizada.mandante,
      visitante: partidaAtualizada.visitante,
      placarMandante: partidaAtualizada.placar_mandante,
      placarVisitante: partidaAtualizada.placar_visitante,
    },
  });
});

app.get('/api/ranking', (_req, res) => {
  const ranking = db
    .prepare(`
      SELECT
        a.id,
        a.nome,
        COALESCE(SUM(p.pontuacao), 0) AS pontos
      FROM apostadores a
      LEFT JOIN palpites p ON p.id_apostador = a.id
      GROUP BY a.id
      ORDER BY pontos DESC, a.nome COLLATE NOCASE ASC
    `)
    .all();

  res.json(ranking);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.' });
});

app.listen(port, () => {
  console.log(`Servidor do bolao rodando em http://localhost:${port}`);
  console.log(`Banco SQLite em ${databasePath}`);
});
