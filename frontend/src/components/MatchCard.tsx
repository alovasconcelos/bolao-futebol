import type { PartidaAberta } from '../types';

interface MatchCardProps {
  partida: PartidaAberta;
}

function formatDate(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${data}T00:00:00`));
}

export function MatchCard({ partida }: MatchCardProps) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-800/85 to-indigo-900/75 p-6 shadow-2xl transition duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-cyan-300/50 hover:shadow-glow">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">Partida em aberto</p>
          <h3 className="mt-2 text-xl font-bold text-white">
            {partida.mandante} <span className="text-cyan-300">x</span> {partida.visitante}
          </h3>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-right text-sm text-cyan-50">
          <div>{formatDate(partida.data)}</div>
          <div className="font-semibold">{partida.hora}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm text-slate-100">
          <thead className="bg-white/10 text-xs uppercase tracking-[0.2em] text-slate-300">
            <tr>
              <th className="px-4 py-3">Apostador</th>
              <th className="px-4 py-3 text-right">
                {partida.mandante} x {partida.visitante}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {partida.palpites.map((palpite) => (
              <tr key={palpite.id} className="bg-white/5 transition group-hover:bg-white/[0.07]">
                <td className="px-4 py-3">{palpite.apostadorNome}</td>
                <td className="px-4 py-3 text-right font-semibold text-cyan-100">
                  {palpite.palpiteMandante} x {palpite.palpiteVisitante}
                </td>
              </tr>
            ))}
            {partida.palpites.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-300">
                  Ainda nao ha palpites registrados para esta partida.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}
