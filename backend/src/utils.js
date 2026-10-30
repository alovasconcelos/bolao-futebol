function normalizeMatchTime(hora) {
  if (typeof hora !== 'string') {
    return '';
  }

  return hora.length >= 5 ? hora.slice(0, 5) : hora;
}

function parseMatchDateTime(data, hora) {
  return new Date(`${data}T${normalizeMatchTime(hora)}:00`);
}

function canEditPrediction(partida) {
  const kickoff = parseMatchDateTime(partida.data, partida.hora);
  return new Date() < kickoff;
}

function formatMatchIdentifier(partida) {
  return `${partida.mandante} x ${partida.visitante}`;
}

function validateScoreValue(value) {
  return Number.isInteger(value) && value >= 0;
}

function getWinner(homeScore, awayScore) {
  if (homeScore === awayScore) {
    return 'empate';
  }

  return homeScore > awayScore ? 'mandante' : 'visitante';
}

function calculatePoints(palpiteMandante, palpiteVisitante, placarMandante, placarVisitante) {
  if (palpiteMandante === placarMandante && palpiteVisitante === placarVisitante) {
    return 3;
  }

  const palpiteWinner = getWinner(palpiteMandante, palpiteVisitante);
  const resultadoWinner = getWinner(placarMandante, placarVisitante);

  if (palpiteWinner === resultadoWinner) {
    return 1;
  }

  return 0;
}

module.exports = {
  calculatePoints,
  canEditPrediction,
  formatMatchIdentifier,
  normalizeMatchTime,
  parseMatchDateTime,
  validateScoreValue,
};
