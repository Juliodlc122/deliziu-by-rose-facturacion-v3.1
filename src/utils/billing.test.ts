import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDocumentTotals,
  calculateItemSubtotal,
  formatDOP,
  formatGeneralQuantity,
  isIncludedItem,
} from './calculations';
import { formatDateCompactDMY, formatDateLongES, parseIsoDateStrict } from './dates';
import { buildWhatsAppSummary, buildWhatsAppUrl } from './whatsapp';
import type { DocumentDraft, LineItem } from '../types';

test('parseIsoDateStrict avoids timezone off-by-one bugs', () => {
  const parsed = parseIsoDateStrict('2026-11-19');
  assert.deepEqual(parsed, { year: 2026, month: 11, day: 19 });
  assert.equal(formatDateLongES('2026-11-19'), '19 de noviembre de 2026');
  assert.equal(formatDateLongES('2026-01-01'), '1 de enero de 2026');
  assert.equal(formatDateLongES(''), 'Por confirmar');
  assert.equal(formatDateCompactDMY('2026-11-19'), '19/11/2026');
  assert.equal(formatDateCompactDMY('2026-03-05'), '05/03/2026');
});

test('formatGeneralQuantity formats pure numbers as pers. and preserves free text', () => {
  assert.equal(formatGeneralQuantity('20'), '20 pers.');
  assert.equal(formatGeneralQuantity(' 35 '), '35 pers.');
  assert.equal(formatGeneralQuantity('2 bandejas'), '2 bandejas');
  assert.equal(formatGeneralQuantity('1 fuente'), '1 fuente');
  assert.equal(formatGeneralQuantity('25 personas'), '25 personas');
  assert.equal(formatGeneralQuantity(''), '—');
});

test('calculateItemSubtotal multiplies unit rows and NEVER multiplies general cost rows', () => {
  const unitRow: LineItem = {
    id: '1',
    description: 'Croquetas de pollo',
    pricingMode: 'unit',
    quantity: '50',
    price: 30,
  };
  assert.equal(calculateItemSubtotal(unitRow), 1500);

  const generalRow: LineItem = {
    id: '2',
    description: 'Arroz con maíz',
    pricingMode: 'general',
    quantity: '20',
    price: 2000,
  };
  assert.equal(calculateItemSubtotal(generalRow), 2000);
  assert.notEqual(calculateItemSubtotal(generalRow), 40000);

  const generalTextRow: LineItem = {
    id: '3',
    description: 'Ensalada rusa',
    pricingMode: 'general',
    quantity: '2 bandejas',
    price: 1850,
  };
  assert.equal(calculateItemSubtotal(generalTextRow), 1850);
});

test('calculateDocumentTotals handles per-person package, included items, extras, and deposit', () => {
  const draft: DocumentDraft = {
    type: 'cotizacion',
    status: 'borrador',
    billingMode: 'por_persona',
    clientName: 'María Fernanda Pérez',
    clientInfo: '809-555-0192 · Cumpleaños',
    issueDate: '2026-11-19',
    deliveryDate: '2026-12-05',
    guestCount: 25,
    pricePerPerson: 950,
    items: [
      { id: 'a', description: 'Moro de guandules', pricingMode: 'unit', quantity: '1', price: 0 },
      { id: 'b', description: 'Arroz con maíz extra', pricingMode: 'general', quantity: '20', price: 2000 },
      { id: 'c', description: 'Mini pastelitos', pricingMode: 'unit', quantity: '50', price: 30 },
    ],
    deposit: 10000,
    notes: '• 50% de adelanto para confirmar.',
  };

  assert.equal(isIncludedItem(draft.items[0], 'por_persona'), true);
  assert.equal(isIncludedItem(draft.items[0], 'por_articulo'), false);

  const totals = calculateDocumentTotals(draft);
  assert.equal(totals.packageSubtotal, 23750);
  assert.equal(totals.itemsSubtotal, 3500);
  assert.equal(totals.grandTotal, 27250);
  assert.equal(totals.deposit, 10000);
  assert.equal(totals.balance, 17250);
  assert.equal(formatDOP(totals.grandTotal), 'RD$ 27,250.00');
});

test('buildWhatsAppSummary formats dates in Spanish, general cost, included dishes, and totals', () => {
  const draft: DocumentDraft = {
    type: 'factura',
    status: 'enviada',
    billingMode: 'por_persona',
    clientName: 'Carlos Méndez',
    clientInfo: '809-555-7788',
    issueDate: '2026-11-19',
    deliveryDate: '2026-11-28',
    guestCount: 20,
    pricePerPerson: 1000,
    items: [
      { id: '1', description: 'Pollo horneado', pricingMode: 'unit', quantity: '20', price: 0 },
      { id: '2', description: 'Arroz con maíz', pricingMode: 'general', quantity: '20', price: 2000 },
    ],
    deposit: 11000,
    notes: 'Reserva con 50% de adelanto.',
  };

  const summary = buildWhatsAppSummary(draft, 'FAC-0004');
  assert.match(summary, /FACTURA FAC-0004/);
  assert.match(summary, /19 de noviembre de 2026/);
  assert.match(summary, /28 de noviembre de 2026/);
  assert.match(summary, /_Incluido_/);
  assert.match(summary, /20 pers\..*\[General\]: RD\$ 2,000\.00/);
  assert.match(summary, /Total General: RD\$ 22,000\.00/);
  assert.match(summary, /Balance pendiente: RD\$ 11,000\.00/);
  assert.match(summary, /809-849-1820/);
  assert.match(summary, /@deliziubyrose/);

  const url = buildWhatsAppUrl(summary, draft.clientInfo);
  assert.ok(url.startsWith('https://wa.me/18095557788?text='));
  assert.match(summary, /\*Deliziubyrose\*/);
});

import {
  deserializeWorkspaceState,
  serializeWorkspaceState,
  type PersistedWorkspaceState,
} from './workspaceStorage';

test('workspace state serializes and restores drafts cleanly after browser restart', () => {
  const state: PersistedWorkspaceState = {
    version: 1,
    draft: {
      type: 'cotizacion',
      status: 'borrador',
      billingMode: 'por_articulo',
      clientName: 'Boda Familia Gómez',
      clientInfo: '809-555-3311',
      issueDate: '2026-11-19',
      deliveryDate: '2026-12-12',
      guestCount: 20,
      pricePerPerson: 0,
      items: [
        { id: 'x1', description: 'Arroz con maíz', pricingMode: 'general', quantity: '20', price: 2000 },
      ],
      deposit: 500,
      notes: '• 50% adelanto',
    },
    editingDocId: null,
    editingDocSnapshot: null,
    dirty: true,
    mobileTab: 'editor',
    savedAt: '2026-11-19T20:00:00.000Z',
  };

  const encoded = serializeWorkspaceState(state);
  const restored = deserializeWorkspaceState(encoded);
  assert.ok(restored);
  assert.equal(restored.draft.clientName, 'Boda Familia Gómez');
  assert.equal(restored.draft.items[0].pricingMode, 'general');
  assert.equal(restored.dirty, true);
  assert.equal(deserializeWorkspaceState('invalid-json'), null);
});

test('supports mixing per_person (individual) and general rows in the same quote, plus general package mode', () => {
  const barIndividual: LineItem = {
    id: 'bar-1',
    description: 'Bar de chocolate',
    pricingMode: 'per_person',
    quantity: '10',
    price: 400,
  };
  const barGeneral: LineItem = {
    id: 'bar-2',
    description: 'Estación de postres',
    pricingMode: 'general',
    quantity: '10',
    price: 4000,
  };

  assert.equal(calculateItemSubtotal(barIndividual), 4000);
  assert.equal(calculateItemSubtotal(barGeneral), 4000);

  const mixedQuote: DocumentDraft = {
    type: 'cotizacion',
    status: 'borrador',
    billingMode: 'por_persona',
    packagePricingMode: 'general',
    packageGeneralPrice: 4000,
    guestCount: 10,
    pricePerPerson: 400,
    clientName: 'Evento Bar de Chocolate',
    clientInfo: '809-555-1212',
    issueDate: '2026-11-19',
    deliveryDate: '2026-12-01',
    items: [barIndividual, barGeneral],
    deposit: 0,
    notes: '50% adelanto',
  };

  const totals = calculateDocumentTotals(mixedQuote);
  assert.equal(totals.packageSubtotal, 4000);
  assert.equal(totals.itemsSubtotal, 8000);
  assert.equal(totals.grandTotal, 12000);

  const wa = buildWhatsAppSummary(mixedQuote, 'COT-0005');
  assert.match(wa, /Paquete para 10 personas \(General\):\* RD\$ 4,000\.00/);
  assert.match(wa, /Bar de chocolate \(10 pers\. × RD\$ 400\.00 \/ pers\.\): RD\$ 4,000\.00/);
  assert.match(wa, /Estación de postres \(10 pers\.\) \[General\]: RD\$ 4,000\.00/);
});
