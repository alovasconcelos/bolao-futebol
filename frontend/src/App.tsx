import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MatchCard } from './components/MatchCard';
import { RankingTable } from './components/RankingTable';
import { ToastContainer } from './components/ToastContainer';
import { api } from './services/api';
import type { Apostador, Palpite, Partida, PartidaAberta, RankingItem, ToastItem } from './types';

interface PendingResult {
  partidaId: number;
  placarMandante: number;
  placarVisitante: number;
  label: string;
}

function formatDate(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${data}T00:00:00`));
}

function canStillBet(partida?: Partida) {
  if (!partida) {
    return false;
  }

  return new Date() < new Date(`${partida.data}T${partida.hora}:00`);
}

export default function App() {
  const [apostadores, setApostadores] = useState<Apostador[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [partidasAbertas, setPartidasAbertas] = useState<PartidaAberta[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);
  const [partidaCalendarioSelecionadaId, setPartidaCalendarioSelecionadaId] = useState<number | null>(null);
  const [palpitesPartidaCalendario, setPalpitesPartidaCalendario] = useState<Palpite[]>([]);
  const [loadingPalpitesCalendario, setLoadingPalpitesCalendario] = useState(false);

  const [apostadorNome, setApostadorNome] = useState('');
  const [partidaForm, setPartidaForm] = useState({
    data: '',
    hora: '',
    mandante: '',
    visitante: '',
  });
  const [palpiteForm, setPalpiteForm] = useState({
    idApostador: '',
    idPartida: '',
    palpiteMandante: '0',
    palpiteVisitante: '0',
  });
  const [resultadoForm, setResultadoForm] = useState({
    idPartida: '',
    placarMandante: '0',
    placarVisitante: '0',
  });

  const pushToast = (type: ToastItem['type'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  };

  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const carregarTudo = async () => {
    const [apostadoresData, partidasData, partidasAbertasData, rankingData] = await Promise.all([
      api.listarApostadores(),
      api.listarPartidas(),
      api.listarPartidasAbertas(),
      api.listarRanking(),
    ]);

    setApostadores(apostadoresData);
    setPartidas(partidasData);
    setPartidasAbertas(partidasAbertasData);
    setRanking(rankingData);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await carregarTudo();
      } catch (error) {
        pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel carregar os dados iniciais.');
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, []);

  const partidaSelecionadaPalpite = useMemo(
    () => partidasAbertas.find((partida) => partida.id === Number(palpiteForm.idPartida)),
    [palpiteForm.idPartida, partidasAbertas]
  );

  const palpiteExistente = useMemo(() => {
    const idApostador = Number(palpiteForm.idApostador);
    const idPartida = Number(palpiteForm.idPartida);

    if (!idApostador || !idPartida) {
      return undefined;
    }

    return partidasAbertas
      .find((partida) => partida.id === idPartida)
      ?.palpites.find((palpite) => palpite.idApostador === idApostador);
  }, [palpiteForm.idApostador, palpiteForm.idPartida, partidasAbertas]);

  const estatisticas = useMemo(
    () => ({
      apostadores: apostadores.length,
      partidas: partidas.length,
      abertas: partidasAbertas.length,
      palpites: partidasAbertas.reduce((acc, partida) => acc + partida.palpites.length, 0),
    }),
    [apostadores.length, partidas.length, partidasAbertas]
  );

  const partidaCalendarioSelecionada = useMemo(
    () => partidas.find((partida) => partida.id === partidaCalendarioSelecionadaId) ?? null,
    [partidas, partidaCalendarioSelecionadaId]
  );

  const handleCriarApostador = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!apostadorNome.trim()) {
      pushToast('info', 'Informe o nome do apostador.');
      return;
    }

    try {
      setSubmitting('apostador');
      await api.criarApostador({ nome: apostadorNome.trim() });
      setApostadorNome('');
      await carregarTudo();
      pushToast('success', 'Apostador cadastrado com sucesso.');
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel cadastrar o apostador.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCriarPartida = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!partidaForm.data || !partidaForm.hora || !partidaForm.mandante.trim() || !partidaForm.visitante.trim()) {
      pushToast('info', 'Preencha todos os campos da partida.');
      return;
    }

    try {
      setSubmitting('partida');
      await api.criarPartida({
        data: partidaForm.data,
        hora: partidaForm.hora,
        mandante: partidaForm.mandante.trim(),
        visitante: partidaForm.visitante.trim(),
      });
      setPartidaForm({ data: '', hora: '', mandante: '', visitante: '' });
      await carregarTudo();
      pushToast('success', 'Partida cadastrada com sucesso.');
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel cadastrar a partida.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleSalvarPalpite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const partidaId = Number(palpiteForm.idPartida);
    const apostadorId = Number(palpiteForm.idApostador);
    const palpiteMandante = Number(palpiteForm.palpiteMandante);
    const palpiteVisitante = Number(palpiteForm.palpiteVisitante);

    if (!partidaId || !apostadorId) {
      pushToast('info', 'Selecione o apostador e a partida.');
      return;
    }

    if (!canStillBet(partidaSelecionadaPalpite)) {
      pushToast('error', 'O prazo para palpites dessa partida ja foi encerrado.');
      return;
    }

    try {
      setSubmitting('palpite');
      const response = await api.salvarPalpite({
        idApostador: apostadorId,
        idPartida: partidaId,
        palpiteMandante,
        palpiteVisitante,
      });
      await carregarTudo();
      pushToast('success', response.message);
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel salvar o palpite.');
    } finally {
      setSubmitting(null);
    }
  };

  const handlePedirConfirmacaoResultado = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const partidaId = Number(resultadoForm.idPartida);
    const placarMandante = Number(resultadoForm.placarMandante);
    const placarVisitante = Number(resultadoForm.placarVisitante);
    const partida = partidasAbertas.find((item) => item.id === partidaId);

    if (!partida) {
      pushToast('info', 'Selecione uma partida em aberto para confirmar o resultado.');
      return;
    }

    if (placarMandante < 0 || placarVisitante < 0) {
      pushToast('info', 'Informe um placar valido.');
      return;
    }

    setPendingResult({
      partidaId,
      placarMandante,
      placarVisitante,
      label: `${partida.mandante} x ${partida.visitante}`,
    });
  };

  const handleSelecionarPartidaCalendario = async (partida: Partida) => {
    if (partidaCalendarioSelecionadaId === partida.id) {
      setPartidaCalendarioSelecionadaId(null);
      setPalpitesPartidaCalendario([]);
      setLoadingPalpitesCalendario(false);
      return;
    }

    setPartidaCalendarioSelecionadaId(partida.id);
    setLoadingPalpitesCalendario(true);

    try {
      const palpites = await api.listarPalpitesDaPartida(partida.id);
      setPalpitesPartidaCalendario(palpites);
    } catch (error) {
      setPartidaCalendarioSelecionadaId(null);
      setPalpitesPartidaCalendario([]);
      pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel carregar as apostas da partida.');
    } finally {
      setLoadingPalpitesCalendario(false);
    }
  };

  const handleConfirmarResultado = async () => {
    if (!pendingResult) {
      return;
    }

    try {
      setSubmitting('resultado');
      await api.salvarResultado(pendingResult.partidaId, {
        placarMandante: pendingResult.placarMandante,
        placarVisitante: pendingResult.placarVisitante,
        confirmacao: true,
      });
      setResultadoForm({ idPartida: '', placarMandante: '0', placarVisitante: '0' });
      setPendingResult(null);
      await carregarTudo();
      pushToast('success', 'Resultado confirmado e pontuacao recalculada.');
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Nao foi possivel confirmar o resultado.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_35%),linear-gradient(180deg,_#0f172a,_#111827_40%,_#020617)] text-slate-50">
      <ToastContainer items={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={pendingResult !== null}
        title={pendingResult ? `Confirmar ${pendingResult.label}` : ''}
        description={
          pendingResult
            ? `Depois de confirmado, o placar ${pendingResult.placarMandante} x ${pendingResult.placarVisitante} nao podera ser alterado.`
            : ''
        }
        onCancel={() => setPendingResult(null)}
        onConfirm={() => void handleConfirmarResultado()}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-200">Bolao Entre Colegas</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Palpites de futebol com ranking ao vivo e placar confirmado em um clique.
              </h1>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Apostadores', value: estatisticas.apostadores },
                { label: 'Partidas', value: estatisticas.partidas },
                { label: 'Partidas abertas', value: estatisticas.abertas },
                { label: 'Palpites abertos', value: estatisticas.palpites },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-cyan-300/15 bg-slate-950/35 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/40"
                >
                  <p className="text-sm text-slate-300">{item.label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <main className="mt-8 space-y-8">
          <section className="grid gap-8 xl:grid-cols-[1.05fr_1.35fr]">
            <RankingTable items={ranking} />

            <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Jogos</p>
                  <h2 className="text-2xl font-bold text-white">Partidas em aberto</h2>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {partidasAbertas.map((partida) => (
                  <MatchCard key={partida.id} partida={partida} />
                ))}
                {partidasAbertas.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/25 p-10 text-center text-slate-300">
                    Nenhuma partida em aberto no momento.
                  </div>
                )}
              </div>
            </section>
          </section>

          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <form
              onSubmit={handleCriarApostador}
              className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Cadastro</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Apostadores</h2>

              <label className="mt-5 block text-sm text-slate-300">
                Nome
                <input
                  value={apostadorNome}
                  onChange={(event) => setApostadorNome(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none ring-0 transition focus:border-cyan-300/50"
                  placeholder="Ex.: Mariana"
                />
              </label>

              <button
                type="submit"
                disabled={submitting === 'apostador'}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === 'apostador' ? 'Salvando...' : 'Cadastrar apostador'}
              </button>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Lista atual</p>
                <div className="space-y-2 text-sm text-slate-200">
                  {apostadores.map((apostador) => (
                    <div key={apostador.id} className="rounded-xl bg-white/5 px-3 py-2">
                      {apostador.nome}
                    </div>
                  ))}
                  {apostadores.length === 0 && <p className="text-slate-400">Nenhum apostador cadastrado.</p>}
                </div>
              </div>
            </form>

            <form
              onSubmit={handleCriarPartida}
              className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Agenda</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Partidas</h2>

              <div className="mt-5 grid gap-4">
                <label className="text-sm text-slate-300">
                  Data
                  <input
                    type="date"
                    value={partidaForm.data}
                    onChange={(event) => setPartidaForm((current) => ({ ...current, data: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Hora
                  <input
                    type="time"
                    value={partidaForm.hora}
                    onChange={(event) => setPartidaForm((current) => ({ ...current, hora: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Mandante
                  <input
                    value={partidaForm.mandante}
                    onChange={(event) => setPartidaForm((current) => ({ ...current, mandante: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  />
                </label>

                <label className="text-sm text-slate-300">
                  Visitante
                  <input
                    value={partidaForm.visitante}
                    onChange={(event) => setPartidaForm((current) => ({ ...current, visitante: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting === 'partida'}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === 'partida' ? 'Salvando...' : 'Cadastrar partida'}
              </button>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Calendario</p>
                <div className="space-y-2 text-sm text-slate-200">
                  {partidas.map((partida) => (
                    <button
                      key={partida.id}
                      type="button"
                      onClick={() => void handleSelecionarPartidaCalendario(partida)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        partidaCalendarioSelecionadaId === partida.id
                          ? 'border-cyan-300/40 bg-cyan-300/10'
                          : 'border-transparent bg-white/5 hover:border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium">
                        {partida.mandante} x {partida.visitante}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(partida.data)} as {partida.hora}{' '}
                        {partida.placarMandante === null ? '• Em aberto' : `• ${partida.placarMandante} x ${partida.placarVisitante}`}
                      </div>
                    </button>
                  ))}
                  {partidas.length === 0 && <p className="text-slate-400">Nenhuma partida cadastrada.</p>}
                </div>

                {partidaCalendarioSelecionada && (
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-slate-950/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">Apostas registradas</p>
                        <h3 className="mt-2 text-base font-semibold text-white">
                          {partidaCalendarioSelecionada.mandante} x {partidaCalendarioSelecionada.visitante}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(partidaCalendarioSelecionada.data)} as {partidaCalendarioSelecionada.hora}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300">
                        {loadingPalpitesCalendario ? 'Carregando...' : `${palpitesPartidaCalendario.length} apostas`}
                      </span>
                    </div>

                    {loadingPalpitesCalendario ? (
                      <div className="mt-4 rounded-xl bg-white/5 px-3 py-4 text-sm text-slate-300">
                        Buscando apostas dessa partida...
                      </div>
                    ) : palpitesPartidaCalendario.length > 0 ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                        <table className="min-w-full text-left text-sm text-slate-100">
                          <tbody className="divide-y divide-white/5">
                            {palpitesPartidaCalendario.map((palpite) => (
                              <tr key={palpite.id} className="bg-white/5">
                                <td className="px-4 py-3">{palpite.apostadorNome}</td>
                                <td className="px-4 py-3 text-right font-semibold text-cyan-100">
                                  {palpite.palpiteMandante} x {palpite.palpiteVisitante}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
                        Nenhuma aposta registrada para essa partida.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>

            <form
              onSubmit={handleSalvarPalpite}
              className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Palpites</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Lancar ou editar</h2>

              <div className="mt-5 grid gap-4">
                <label className="text-sm text-slate-300">
                  Apostador
                  <select
                    value={palpiteForm.idApostador}
                    onChange={(event) => setPalpiteForm((current) => ({ ...current, idApostador: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  >
                    <option value="">Selecione</option>
                    {apostadores.map((apostador) => (
                      <option key={apostador.id} value={apostador.id}>
                        {apostador.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-slate-300">
                  Partida em aberto
                  <select
                    value={palpiteForm.idPartida}
                    onChange={(event) => setPalpiteForm((current) => ({ ...current, idPartida: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  >
                    <option value="">Selecione</option>
                    {partidasAbertas.map((partida) => (
                      <option key={partida.id} value={partida.id}>
                        {partida.mandante} x {partida.visitante} - {formatDate(partida.data)} {partida.hora}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-slate-300">
                    Gols mandante
                    <input
                      type="number"
                      min={0}
                      value={palpiteForm.palpiteMandante}
                      onChange={(event) =>
                        setPalpiteForm((current) => ({ ...current, palpiteMandante: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    Gols visitante
                    <input
                      type="number"
                      min={0}
                      value={palpiteForm.palpiteVisitante}
                      onChange={(event) =>
                        setPalpiteForm((current) => ({ ...current, palpiteVisitante: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm text-cyan-50">
                {palpiteExistente
                  ? `Ja existe um palpite para essa combinacao. Ao salvar, vamos atualizar ${palpiteExistente.palpiteMandante} x ${palpiteExistente.palpiteVisitante}.`
                  : 'Cada apostador pode ter apenas um palpite por partida. Se ja existir, o envio entra como edicao.'}
              </div>

              {partidaSelecionadaPalpite && !canStillBet(partidaSelecionadaPalpite) && (
                <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                  O prazo desta partida terminou. O backend tambem bloqueia novas alteracoes.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting === 'palpite' || !apostadores.length || !partidasAbertas.length}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === 'palpite'
                  ? 'Salvando...'
                  : palpiteExistente
                    ? 'Atualizar palpite'
                    : 'Registrar palpite'}
              </button>
            </form>

            <form
              onSubmit={handlePedirConfirmacaoResultado}
              className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl backdrop-blur-xl"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Resultados</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Confirmar placar</h2>

              <div className="mt-5 grid gap-4">
                <label className="text-sm text-slate-300">
                  Partida em aberto
                  <select
                    value={resultadoForm.idPartida}
                    onChange={(event) => setResultadoForm((current) => ({ ...current, idPartida: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                  >
                    <option value="">Selecione</option>
                    {partidasAbertas.map((partida) => (
                      <option key={partida.id} value={partida.id}>
                        {partida.mandante} x {partida.visitante}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-slate-300">
                    Placar mandante
                    <input
                      type="number"
                      min={0}
                      value={resultadoForm.placarMandante}
                      onChange={(event) =>
                        setResultadoForm((current) => ({ ...current, placarMandante: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>

                  <label className="text-sm text-slate-300">
                    Placar visitante
                    <input
                      type="number"
                      min={0}
                      value={resultadoForm.placarVisitante}
                      onChange={(event) =>
                        setResultadoForm((current) => ({ ...current, placarVisitante: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
                Depois de confirmar, o backend bloqueia qualquer alteracao futura do resultado e recalcula a pontuacao
                em transacao SQLite.
              </div>

              <button
                type="submit"
                disabled={submitting === 'resultado' || !partidasAbertas.length}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === 'resultado' ? 'Confirmando...' : 'Revisar e confirmar'}
              </button>
            </form>
          </section>
        </main>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/10 bg-slate-900/90 px-6 py-4 text-sm font-semibold text-white shadow-2xl">
            Carregando o bolao...
          </div>
        </div>
      )}
    </div>
  );
}
