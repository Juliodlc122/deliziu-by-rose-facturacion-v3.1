import type { RefObject } from 'react';
import { BUSINESS_INFO } from '../types';
import type { DocumentDraft } from '../types';
import {
  calculateDocumentTotals,
  calculateItemSubtotal,
  formatDOP,
  formatGeneralQuantity,
  formatPerPersonQuantity,
  formatUnitQuantity,
  isIncludedItem,
} from '../utils/calculations';
import { formatDateLongES } from '../utils/dates';
import { BrandLogo } from './BrandLogo';

interface InvoiceSheetProps {
  draft: DocumentDraft;
  folio: string;
  sheetRef?: RefObject<HTMLDivElement | null>;
}

function WhatsAppMicroIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" stroke="#25d366" strokeWidth="2" />
      <path
        d="M8.8 8.9c.2-.5.5-.5.8-.5h.6c.2 0 .4.1.5.4l.7 1.7c.1.2.1.4 0 .6l-.4.6c-.1.2-.1.3 0 .5.4.7 1.1 1.4 1.9 1.8.2.1.3.1.5 0l.6-.4c.2-.1.4-.1.6 0l1.6.8c.2.1.4.3.4.5v.6c0 .4-.2.8-.6 1-.5.3-1.3.4-2.3.1-1.4-.4-2.9-1.4-4-2.7-1.1-1.2-1.8-2.6-1.9-3.9 0-.6.1-1.1.4-1.5z"
        fill="#25d366"
      />
    </svg>
  );
}

function InstagramMicroIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4.8"
        stroke="#e1306c"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3.8" stroke="#e1306c" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="#e1306c" />
    </svg>
  );
}

export function InvoiceSheet({ draft, folio, sheetRef }: InvoiceSheetProps) {
  const totals = calculateDocumentTotals(draft);
  const docTitle = draft.type === 'factura' ? 'FACTURA' : 'COTIZACIÓN';
  const activeFolio = folio || (draft.type === 'factura' ? 'FAC-0001' : 'COT-0001');

  const visibleItems = draft.items.filter(
    (item) =>
      item.description.trim() !== '' ||
      item.quantity.trim() !== '' ||
      Number(item.price) > 0,
  );

  const noteLines = draft.notes
    .split('\n')
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);

  return (
    <div
      id="printable-sheet"
      ref={sheetRef}
      data-testid="invoice-sheet"
      className="font-sheet bg-[#ffffff] text-[#18181b] w-full max-w-[780px] mx-auto rounded-lg shadow-xl border border-[#e4e4e7] overflow-hidden"
    >
      <div className="px-4 py-6 sm:px-10 sm:py-9">
        {/* Blended Header: Circular Logo + Deliziubyrose serif left | Clean Typographic Title, Folio & Social Icons right */}
        <header className="flex items-center justify-between gap-2.5 sm:gap-4 pb-5 border-b border-[#d4d4d8]">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <BrandLogo size="md" className="w-12 h-12 sm:w-[74px] sm:h-[74px] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-brand-serif text-[17px] sm:text-[26px] font-bold leading-tight text-[#18181b] tracking-tight whitespace-nowrap">
                {BUSINESS_INFO.brandName}
              </h2>
              <p className="text-[10.5px] sm:text-[12.5px] font-medium text-[#71717a] mt-0.5 tracking-wide whitespace-nowrap">
                {BUSINESS_INFO.subtitle}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[15px] sm:text-[21px] font-bold tracking-[0.07em] text-[#18181b] leading-none">
              {docTitle}
            </div>
            <div
              data-testid="sheet-folio"
              className="font-mono-num text-[11px] sm:text-xs font-semibold text-[#71717a] mt-1.5"
            >
              {activeFolio}
            </div>
            <div className="mt-2 space-y-1 text-[10.5px] sm:text-xs text-[#3f3f46]">
              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                <WhatsAppMicroIcon />
                <span className="tabular-nums">{BUSINESS_INFO.whatsappDisplay}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                <InstagramMicroIcon />
                <span>{BUSINESS_INFO.instagram}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Blended 2-Column Client & Dates Block (compact V1 grid + V2 clean Label: Value elegance) */}
        <section className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6 text-xs sm:text-[13px] leading-relaxed">
          <div className="space-y-1.5">
            <div>
              <span className="font-semibold text-[#18181b]">Cliente: </span>
              <span
                data-testid="sheet-client-name"
                className="font-medium text-[#18181b] break-words"
              >
                {draft.clientName.trim() || 'Por confirmar'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#18181b]">Info: </span>
              <span className="text-[#52525b] break-words">
                {draft.clientInfo.trim() || '---'}
              </span>
            </div>
          </div>

          <div className="sm:text-right space-y-1.5">
            <div>
              <span className="font-semibold text-[#18181b]">Emisión: </span>
              <span data-testid="sheet-issue-date" className="text-[#27272a]">
                {formatDateLongES(draft.issueDate, 'Por confirmar')}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#18181b]">Entrega: </span>
              <span data-testid="sheet-delivery-date" className="text-[#27272a]">
                {formatDateLongES(draft.deliveryDate, 'Por confirmar')}
              </span>
            </div>
            <div className="text-[11px] text-[#71717a]">
              Moneda: <span className="font-medium text-[#52525b]">{BUSINESS_INFO.currencyLabel}</span>
            </div>
          </div>
        </section>

        {/* Conditional Subtle Per-Person Package Strip */}
        {draft.billingMode === 'por_persona' && (
          <section
            data-testid="sheet-per-person-banner"
            className="mb-4 rounded border border-[#e4e4e7] bg-[#fafafa] px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]"
          >
            <div>
              {draft.packagePricingMode === 'general' ? (
                <>
                  <span className="font-semibold text-[#18181b]">
                    Paquete para {draft.guestCount}{' '}
                    {draft.guestCount === 1 ? 'persona' : 'personas'}
                  </span>{' '}
                  <span className="inline-block text-[10.5px] font-medium text-[#52525b] bg-[#f4f4f5] border border-[#e4e4e7] px-1.5 py-0.5 rounded align-middle ml-1">
                    General
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-[#18181b]">Paquete por persona: </span>
                  <span className="text-[#3f3f46] tabular-nums">
                    {draft.guestCount} {draft.guestCount === 1 ? 'persona' : 'personas'} ×{' '}
                    {formatDOP(draft.pricePerPerson)}
                  </span>
                </>
              )}
            </div>
            <div className="font-bold text-[#18181b] tabular-nums whitespace-nowrap">
              {formatDOP(totals.packageSubtotal)}
            </div>
          </section>
        )}

        {/* Detail Table: V2 column order (Cantidad | Descripción | Precio | Total) with crisp subtle styling */}
        <section className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f5f5f5] border border-[#e4e4e7] text-[10px] sm:text-xs font-semibold text-[#18181b]">
                <th className="py-2.5 px-1.5 sm:px-3 border-r border-[#e4e4e7] text-center whitespace-nowrap">
                  <span className="sm:hidden">Cant.</span>
                  <span className="hidden sm:inline">Cantidad</span>
                </th>
                <th className="py-2.5 px-1.5 sm:px-3.5 border-r border-[#e4e4e7]">
                  Descripción
                </th>
                <th className="py-2.5 px-1.5 sm:px-3 border-r border-[#e4e4e7] text-right whitespace-nowrap">
                  Precio
                </th>
                <th className="py-2.5 px-1.5 sm:px-3 text-right whitespace-nowrap">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef2] text-[10.5px] sm:text-[13px] border-x border-b border-[#eceef2]">
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8a8f98] italic">
                    {draft.billingMode === 'por_persona'
                      ? 'Agrega los platos incluidos o extras desde el editor.'
                      : 'Agrega artículos o servicios desde el editor.'}
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => {
                  const included = isIncludedItem(item, draft.billingMode);
                  const isGeneral = item.pricingMode === 'general';
                  const isPerPerson = item.pricingMode === 'per_person';
                  const rowTotal = calculateItemSubtotal(item);

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="py-2.5 px-1.5 sm:px-3 text-center text-[#3f3f46] tabular-nums whitespace-nowrap">
                        {isGeneral
                          ? formatGeneralQuantity(item.quantity)
                          : isPerPerson
                            ? formatPerPersonQuantity(item.quantity)
                            : formatUnitQuantity(item.quantity)}
                      </td>
                      <td className="py-2.5 px-1.5 sm:px-3.5 text-[#18181b] font-medium break-words">
                        {item.description.trim() || 'Artículo sin descripción'}
                      </td>
                      <td className="py-2.5 px-1.5 sm:px-3 text-right tabular-nums whitespace-nowrap">
                        {included ? (
                          <span className="text-[#a1a1aa]">—</span>
                        ) : isGeneral ? (
                          <span className="inline-block text-[9.5px] sm:text-[11px] font-medium text-[#52525b] bg-[#f4f4f5] border border-[#e4e4e7] px-1.5 py-0.5 rounded">
                            General
                          </span>
                        ) : isPerPerson ? (
                          <span className="text-[#3f3f46] leading-tight">
                            <span>{formatDOP(item.price)}</span>
                            <span className="block sm:inline text-[#71717a] text-[9px] sm:text-[11px]">
                              {' '}
                              / pers.
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#3f3f46]">{formatDOP(item.price)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-1.5 sm:px-3 text-right font-semibold tabular-nums whitespace-nowrap">
                        {included ? (
                          <span className="inline-block text-[9.5px] sm:text-[11px] font-medium text-[#52525b] bg-[#f4f4f5] border border-[#e4e4e7] px-1.5 py-0.5 rounded">
                            Incluido
                          </span>
                        ) : (
                          <span className="text-[#18181b]">{formatDOP(rowTotal)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* Blended Closing: Dashed divider + 2-column Terms (left) & Refined Totals Card (right) */}
        <section className="mt-6 pt-5 border-t border-dashed border-[#e4e4e7] grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="sm:col-span-6 order-2 sm:order-1">
            <h3 className="text-xs font-semibold text-[#27272a] mb-2">
              Términos y Condiciones:
            </h3>
            {noteLines.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-xs text-[#52525b] leading-relaxed">
                {noteLines.map((line, i) => (
                  <li key={i} className="break-words">
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#71717a]">Sin notas adicionales.</p>
            )}
          </div>

          <div className="sm:col-span-6 order-1 sm:order-2">
            <div className="rounded border border-[#e4e4e7] bg-[#fafafa] overflow-hidden">
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold text-[#52525b] whitespace-nowrap">
                    Total General
                  </span>
                  <span
                    data-testid="sheet-grand-total"
                    className="text-base sm:text-[17px] font-bold text-[#18181b] tabular-nums whitespace-nowrap shrink-0"
                  >
                    {formatDOP(totals.grandTotal)}
                  </span>
                </div>

                {totals.deposit > 0 && (
                  <div className="border-t border-[#e4e4e7] pt-2 flex items-baseline justify-between gap-3">
                    <span className="text-xs text-[#52525b] whitespace-nowrap">
                      Abono recibido
                    </span>
                    <span
                      data-testid="sheet-deposit"
                      className="text-xs sm:text-sm font-semibold text-[#3f3f46] tabular-nums whitespace-nowrap shrink-0"
                    >
                      - {formatDOP(totals.deposit)}
                    </span>
                  </div>
                )}
              </div>

              {totals.deposit > 0 && (
                <div className="px-4 py-2.5 bg-[#fdf5f5] border-t border-[#edd6d8] flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold text-[#7f1d22] whitespace-nowrap">
                    Balance pendiente
                  </span>
                  <span
                    data-testid="sheet-balance"
                    className="text-sm sm:text-[15px] font-bold text-[#8b1e24] tabular-nums whitespace-nowrap shrink-0"
                  >
                    {formatDOP(totals.balance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Subtle Centered Footer */}
        <footer className="mt-7 pt-4 border-t border-[#f0f1f4] text-center space-y-1">
          <p className="font-brand-serif italic text-[13px] text-[#3f3f46]">
            Gracias por confiar en {BUSINESS_INFO.brandName}
          </p>
          <p className="text-[10.5px] sm:text-[11px] text-[#71717a]">
            WhatsApp: {BUSINESS_INFO.whatsappDisplay} · Instagram: {BUSINESS_INFO.instagram} · República Dominicana
          </p>
        </footer>
      </div>
    </div>
  );
}
