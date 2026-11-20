import type { DocumentDraft, LineItem } from '../types';

export interface DocumentTotals {
  packageSubtotal: number;
  itemsSubtotal: number;
  grandTotal: number;
  deposit: number;
  balance: number;
}

/**
 * Safely parses numeric quantities (e.g., "50", "2.5", "10"). Non-numeric values return 0.
 */
export function parseNumericQuantity(raw: string | number): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }
  const normalized = String(raw ?? '').trim().replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Safely parses monetary amounts. Negative or NaN values clamp to 0.
 */
export function sanitizeMoney(value: number | string): number {
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Formats the quantity/people cell for a general-cost row:
 * - Pure integer/number like "20" -> "20 pers."
 * - Free text like "2 bandejas" or "25 personas" -> displayed as-is
 * - Empty -> "—"
 */
export function formatGeneralQuantity(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '—';
  if (/^\d+([.,]\d+)?$/.test(trimmed)) {
    return `${trimmed} pers.`;
  }
  return trimmed;
}

/**
 * Formats the quantity/people cell for a per-person row (e.g., "10" -> "10 pers.").
 */
export function formatPerPersonQuantity(raw: string): string {
  return formatGeneralQuantity(raw);
}

/**
 * Formats the quantity/people cell for a unit-priced row.
 */
export function formatUnitQuantity(raw: string): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '0';
  return trimmed;
}

/**
 * Determines whether a line item represents an included dish in "Por Persona" mode.
 */
export function isIncludedItem(item: LineItem, billingMode: DocumentDraft['billingMode']): boolean {
  return billingMode === 'por_persona' && sanitizeMoney(item.price) === 0;
}

/**
 * Computes the exact subtotal for a single line item:
 * - In 'general' mode: returns item.price directly WITHOUT multiplying by quantity/people.
 * - In 'unit' or 'per_person' mode: returns parseNumericQuantity(item.quantity) * item.price.
 */
export function calculateItemSubtotal(item: LineItem): number {
  const price = sanitizeMoney(item.price);
  if (item.pricingMode === 'general') {
    return price;
  }
  const qty = parseNumericQuantity(item.quantity);
  return Math.round(qty * price * 100) / 100;
}

/**
 * Computes all document-level financial totals (package base, items sum, total, deposit, pending balance).
 */
export function calculateDocumentTotals(draft: DocumentDraft): DocumentTotals {
  const guestCount = Math.max(0, Math.floor(Number(draft.guestCount) || 0));
  const pricePerPerson = sanitizeMoney(draft.pricePerPerson);
  const packageGeneralPrice = sanitizeMoney(draft.packageGeneralPrice ?? 0);
  const packageMode = draft.packagePricingMode === 'general' ? 'general' : 'individual';

  const packageSubtotal =
    draft.billingMode === 'por_persona'
      ? packageMode === 'general'
        ? packageGeneralPrice
        : Math.round(guestCount * pricePerPerson * 100) / 100
      : 0;

  const itemsSubtotal = draft.items.reduce((sum, item) => {
    return Math.round((sum + calculateItemSubtotal(item)) * 100) / 100;
  }, 0);

  const grandTotal = Math.round((packageSubtotal + itemsSubtotal) * 100) / 100;
  const deposit = sanitizeMoney(draft.deposit);
  const balance = Math.max(0, Math.round((grandTotal - deposit) * 100) / 100);

  return {
    packageSubtotal,
    itemsSubtotal,
    grandTotal,
    deposit,
    balance,
  };
}

/**
 * Formats a number in Dominican Pesos: "RD$ 1,500.00".
 */
export function formatDOP(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `RD$ ${formatted}`;
}

/**
 * Creates a clean export filename without unsafe filesystem characters.
 */
export function buildExportFilename(folio: string, clientName: string, ext: 'pdf' | 'png'): string {
  const cleanFolio = (folio || 'DOC').replace(/[^a-zA-Z0-9-_]/g, '');
  const cleanClient = (clientName || 'Cliente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `${cleanFolio}_${cleanClient || 'Cliente'}.${ext}`;
}
