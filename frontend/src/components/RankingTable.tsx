import type { RankingItem } from '../types';

interface RankingTableProps {
  items: RankingItem[];
}

export function RankingTable({ items }: RankingTableProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-glow backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-200">Ranking</p>
          <h2 className="text-2xl font-bold text-white">Pontuacao geral</h2>
        </div>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          {items.length} apostadores
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left">
          <thead className="bg-slate-950/30 text-xs uppercase tracking-[0.25em] text-slate-300">
            <tr>
              <th className="px-4 py-3">Posicao</th>
              <th className="px-4 py-3">Apostador</th>
              <th className="px-4 py-3 text-right">Pontos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-slate-100">
            {items.map((item, index) => (
              <tr key={item.id} className="bg-white/5 transition hover:bg-white/10">
                <td className="px-4 py-3 font-semibold text-cyan-200">{String(index + 1).padStart(2, '0')}</td>
                <td className="px-4 py-3">{item.nome}</td>
                <td className="px-4 py-3 text-right font-bold text-white">{item.pontos}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-300">
                  Nenhum apostador cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
