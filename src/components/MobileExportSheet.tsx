import { Copy, FileDown, ImageDown, MessageCircle, Printer, Save, X } from 'lucide-react';
import { formatDOP } from '../utils/calculations';

interface MobileExportSheetProps {
  open: boolean;
  folio: string;
  clientName: string;
  grandTotal: number;
  isEditing: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
  onWhatsApp: () => void;
  onPng: () => void;
  onPdf: () => void;
  onPrint: () => void;
  onDuplicate?: () => void;
}

export function MobileExportSheet({
  open,
  folio,
  clientName,
  grandTotal,
  isEditing,
  busy,
  onClose,
  onSave,
  onWhatsApp,
  onPng,
  onPdf,
  onPrint,
  onDuplicate,
}: MobileExportSheetProps) {
  if (!open) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 xl:hidden flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-export-title"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-[#1b1d22] border-t border-[#343944] px-5 pt-3 pb-7 shadow-2xl">
        <div
          className="w-10 h-1.5 rounded-full bg-[#3f4554] mx-auto mb-4"
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 id="mobile-export-title" className="text-base font-semibold text-white">
              Enviar y exportar
            </h2>
            <p className="text-xs text-[#a1a7b3] mt-0.5 truncate">
              <span className="font-mono-num text-[#d4d8e0]">{folio}</span> ·{' '}
              {clientName.trim() || 'Cliente por confirmar'} ·{' '}
              <span className="font-mono-num font-semibold text-white">
                {formatDOP(grandTotal)}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú de exportación"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-[#a1a7b3] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onClose();
              onWhatsApp();
            }}
            className="w-full min-h-[50px] flex items-center justify-center gap-2.5 rounded-xl bg-[#25d366] active:scale-[0.99] text-[#0c1a11] font-bold text-sm px-4 transition-transform cursor-pointer disabled:opacity-60"
          >
            <MessageCircle className="w-5 h-5" aria-hidden="true" />
            <span>Enviar resumen por WhatsApp</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onClose();
                onPng();
              }}
              className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#23262d] hover:bg-[#2c303a] border border-[#343944] text-white font-semibold text-sm px-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <ImageDown className="w-4 h-4 text-[#bb86fc]" aria-hidden="true" />
              <span>Imagen PNG</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onClose();
                onPdf();
              }}
              className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#23262d] hover:bg-[#2c303a] border border-[#343944] text-white font-semibold text-sm px-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <FileDown className="w-4 h-4 text-[#64b5f6]" aria-hidden="true" />
              <span>Descargar PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onClose();
                onPrint();
              }}
              className="min-h-[46px] flex items-center justify-center gap-2 rounded-xl bg-[#23262d] hover:bg-[#2c303a] border border-[#343944] text-[#e4e7ec] font-medium text-sm px-3 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Printer className="w-4 h-4 text-[#a1a7b3]" aria-hidden="true" />
              <span>Imprimir</span>
            </button>

            {isEditing && onDuplicate ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onDuplicate();
                }}
                className="min-h-[46px] flex items-center justify-center gap-2 rounded-xl bg-[#23262d] hover:bg-[#2c303a] border border-[#343944] text-[#e4e7ec] font-medium text-sm px-3 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Copy className="w-4 h-4 text-[#a1a7b3]" aria-hidden="true" />
                <span>Duplicar</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onClose();
                  onSave();
                }}
                className="min-h-[46px] flex items-center justify-center gap-2 rounded-xl bg-[#1e88e5] text-white font-semibold text-sm px-3 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>Guardar</span>
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#7c8391]">
          Al exportar o enviar, tus cambios se guardan automáticamente con folio oficial.
        </p>
      </div>
    </div>
  );
}
