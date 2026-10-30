import type { ToastItem } from '../types';

interface ToastContainerProps {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}

const colorMap = {
  success: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
  error: 'border-rose-400/60 bg-rose-500/15 text-rose-100',
  info: 'border-sky-400/60 bg-sky-500/15 text-sky-100',
};

export function ToastContainer({ items, onDismiss }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${colorMap[item.type]}`}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium leading-6">{item.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="rounded-full px-2 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
