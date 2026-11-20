import { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import { buildWhatsAppUrl } from '../utils/whatsapp';

interface WhatsAppModalProps {
  open: boolean;
  message: string;
  clientInfo: string;
  folio: string;
  onClose: () => void;
  onCopied: () => void;
}

export function WhatsAppModal({
  open,
  message,
  clientInfo,
  folio,
  onClose,
  onCopied,
}: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const waHref = buildWhatsAppUrl(message, clientInfo);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback selection copy
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      onCopied();
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#1b1d22] border border-[#2e323c] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-[#2a2e37] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4 text-[#25d366]" aria-hidden="true" />
            <h2 id="wa-modal-title" className="text-sm font-semibold text-white">
              Resumen para WhatsApp · {folio}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar resumen de WhatsApp"
            className="p-1.5 rounded-lg text-[#8f96a3] hover:text-white hover:bg-[#23262d] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-[#a1a7b3]">
            El documento ya fue guardado automáticamente. Puedes abrirlo directo en WhatsApp o
            copiar el texto formateado.
          </p>

          <pre className="whitespace-pre-wrap break-words rounded-lg bg-[#121212] border border-[#2a2e37] p-4 text-xs text-[#e4e7ec] leading-relaxed font-sans">
            {message}
          </pre>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#23262d] hover:bg-[#2e323c] border border-[#343944] text-white text-xs font-semibold px-4 py-2.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#25d366]" aria-hidden="true" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copiar mensaje</span>
                </>
              )}
            </button>

            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25d366] hover:bg-[#20bd5a] text-[#0c1a11] text-xs font-bold px-4 py-2.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              <span>Abrir en WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
