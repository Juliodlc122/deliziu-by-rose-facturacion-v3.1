import { BUSINESS_INFO } from '../types';
import type { DocumentDraft } from '../types';
import {
  calculateDocumentTotals,
  calculateItemSubtotal,
  formatDOP,
  formatGeneralQuantity,
  isIncludedItem,
} from './calculations';
import { formatDateLongES } from './dates';

/**
 * Builds a clean, formatted Spanish WhatsApp summary for a quote or invoice.
 */
export function buildWhatsAppSummary(draft: DocumentDraft, folio: string): string {
  const totals = calculateDocumentTotals(draft);
  const docLabel = draft.type === 'factura' ? 'FACTURA' : 'COTIZACIÓN';
  const lines: string[] = [];

  lines.push(`*${BUSINESS_INFO.brandName}* — ${BUSINESS_INFO.subtitle}`);
  lines.push(`*${docLabel} ${folio || '(Borrador)'}*`);
  lines.push('');
  lines.push(`*Cliente:* ${draft.clientName.trim() || 'Por confirmar'}`);
  if (draft.clientInfo.trim()) {
    lines.push(`*Referencia / Tel.:* ${draft.clientInfo.trim()}`);
  }
  lines.push(`*Emisión:* ${formatDateLongES(draft.issueDate, 'Por confirmar')}`);
  lines.push(`*Entrega / Evento:* ${formatDateLongES(draft.deliveryDate, 'Por confirmar')}`);
  lines.push('');

  if (draft.billingMode === 'por_persona') {
    if (draft.packagePricingMode === 'general') {
      lines.push(
        `*Paquete para ${draft.guestCount} personas (General):* ${formatDOP(totals.packageSubtotal)}`,
      );
    } else {
      lines.push(
        `*Paquete por persona:* ${draft.guestCount} personas × ${formatDOP(draft.pricePerPerson)} = ${formatDOP(totals.packageSubtotal)}`,
      );
    }
  }

  const activeItems = draft.items.filter(
    (item) => item.description.trim() !== '' || item.price > 0,
  );
  if (activeItems.length > 0) {
    lines.push(draft.billingMode === 'por_persona' ? '*Detalle de menú y extras:*' : '*Detalle:*');
    for (const item of activeItems) {
      const desc = item.description.trim() || 'Artículo sin descripción';
      if (isIncludedItem(item, draft.billingMode)) {
        const qtySuffix = item.quantity.trim()
          ? ` (${item.pricingMode === 'unit' ? item.quantity.trim() : formatGeneralQuantity(item.quantity)})`
          : '';
        lines.push(`• ${desc}${qtySuffix} — _Incluido_`);
      } else if (item.pricingMode === 'general') {
        const qtyText = formatGeneralQuantity(item.quantity);
        const qtyPart = qtyText !== '—' ? ` (${qtyText})` : '';
        lines.push(`• ${desc}${qtyPart} [General]: ${formatDOP(calculateItemSubtotal(item))}`);
      } else if (item.pricingMode === 'per_person') {
        const sub = calculateItemSubtotal(item);
        const qtyText = formatGeneralQuantity(item.quantity);
        lines.push(`• ${desc} (${qtyText} × ${formatDOP(item.price)} / pers.): ${formatDOP(sub)}`);
      } else {
        const sub = calculateItemSubtotal(item);
        lines.push(
          `• ${item.quantity.trim() || '0'} × ${desc} (${formatDOP(item.price)} c/u): ${formatDOP(sub)}`,
        );
      }
    }
  }

  lines.push('');
  lines.push(`*Total General: ${formatDOP(totals.grandTotal)}*`);
  if (totals.deposit > 0) {
    lines.push(`Abono recibido: ${formatDOP(totals.deposit)}`);
    lines.push(`*Balance pendiente: ${formatDOP(totals.balance)}*`);
  }

  if (draft.notes.trim()) {
    lines.push('');
    lines.push('*Condiciones:*');
    lines.push(draft.notes.trim());
  }

  lines.push('');
  lines.push(`WhatsApp: ${BUSINESS_INFO.whatsappDisplay} | Instagram: ${BUSINESS_INFO.instagram}`);

  return lines.join('\n');
}

/**
 * Extracts a Dominican/international phone number from clientInfo if present;
 * otherwise opens WhatsApp compose with the prefilled text.
 */
export function buildWhatsAppUrl(message: string, clientInfo?: string): string {
  const encoded = encodeURIComponent(message);
  const digitsMatch = (clientInfo ?? '').match(/(?:\+?1[\s.-]?)?(?:809|829|849)[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (digitsMatch) {
    const clean = digitsMatch[0].replace(/\D/g, '');
    const withCountry = clean.length === 10 ? `1${clean}` : clean;
    return `https://wa.me/${withCountry}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
