import type { Apostador, Partida, PartidaAberta, RankingItem } from '../types';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

async function request<T>(path: string, method: HttpMethod = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro ao processar a requisicao.' }));
    throw new Error(errorBody.message || 'Erro ao processar a requisicao.');
  }

  return response.json() as Promise<T>;
}

export const api = {
  listarApostadores: () => request<Apostador[]>('/api/apostadores'),
  criarApostador: (payload: { nome: string }) => request<Apostador>('/api/apostadores', 'POST', payload),
  listarPartidas: () => request<Partida[]>('/api/partidas'),
  criarPartida: (payload: { data: string; hora: string; mandante: string; visitante: string }) =>
    request<Partida>('/api/partidas', 'POST', payload),
  listarPartidasAbertas: () => request<PartidaAberta[]>('/api/partidas/abertas'),
  salvarPalpite: (payload: {
    idApostador: number;
    idPartida: number;
    palpiteMandante: number;
    palpiteVisitante: number;
  }) =>
    request<{ message: string; wasUpdate: boolean }>('/api/palpites', 'POST', payload),
  salvarResultado: (partidaId: number, payload: { placarMandante: number; placarVisitante: number; confirmacao: boolean }) =>
    request<{ message: string }>(`/api/partidas/${partidaId}/resultado`, 'PATCH', payload),
  listarRanking: () => request<RankingItem[]>('/api/ranking'),
};
