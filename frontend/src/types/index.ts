export interface Apostador {
  id: number;
  nome: string;
}

export interface Partida {
  id: number;
  data: string;
  hora: string;
  mandante: string;
  visitante: string;
  placarMandante: number | null;
  placarVisitante: number | null;
}

export interface Palpite {
  id: number;
  idApostador: number;
  idPartida: number;
  apostadorNome: string;
  palpiteMandante: number;
  palpiteVisitante: number;
  pontuacao: number;
}

export interface PartidaAberta extends Partida {
  palpites: Palpite[];
}

export interface RankingItem {
  id: number;
  nome: string;
  pontos: number;
}

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}
