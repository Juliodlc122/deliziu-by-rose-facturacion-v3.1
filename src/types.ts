export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export type DocumentType = 'cotizacion' | 'factura';
export type DocumentStatus = 'borrador' | 'enviada' | 'pagada';
export type BillingMode = 'por_articulo' | 'por_persona';
export type PackagePricingMode = 'individual' | 'general';
export type ItemPricingMode = 'unit' | 'per_person' | 'general';

export interface LineItem {
  id: string;
  description: string;
  pricingMode: ItemPricingMode;
  quantity: string;
  price: number;
}

export interface DocumentDraft {
  type: DocumentType;
  status: DocumentStatus;
  billingMode: BillingMode;
  packagePricingMode?: PackagePricingMode;
  packageGeneralPrice?: number;
  clientName: string;
  clientInfo: string;
  issueDate: string;
  deliveryDate: string;
  guestCount: number;
  pricePerPerson: number;
  items: LineItem[];
  deposit: number;
  notes: string;
}

export interface SavedDocument extends DocumentDraft {
  id: string;
  folio: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const BUSINESS_INFO = {
  brandName: 'Deliziubyrose',
  subtitle: 'Catering & Eventos',
  whatsappDisplay: '809-849-1820',
  whatsappDigits: '18098491820',
  instagram: '@deliziubyrose',
  currencyLabel: 'DOP (RD$)',
  logoPath: '/assets/aistudio/logo_deliziu_2f17718a.png',
  defaultNotes:
    '• Reserva con un 50% de adelanto para confirmar el pedido.\n• No incluye gastos de envío / transporte.',
} as const;
