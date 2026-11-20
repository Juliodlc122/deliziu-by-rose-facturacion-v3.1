import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-20 right-4 z-50 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const icon =
          toast.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#25d366] shrink-0" aria-hidden="true" />
          ) : toast.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#cf6679] shrink-0" aria-hidden="true" />
          ) : (
            <Info className="w-4 h-4 text-[#bb86fc] shrink-0" aria-hidden="true" />
          );

        const borderTone =
          toast.tone === 'success'
            ? 'border-[#25d366]/40'
            : toast.tone === 'error'
              ? 'border-[#cf6679]/50'
              : 'border-[#bb86fc]/40';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg bg-[#23262d] border ${borderTone} px-3.5 py-2.5 text-sm text-[#f4f4f6] shadow-xl`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icon}
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="text-[#8f96a3] hover:text-white p-1 rounded cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
