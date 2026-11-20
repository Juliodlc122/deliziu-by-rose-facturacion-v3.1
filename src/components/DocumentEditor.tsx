import { ArrowLeftRight, CheckCircle2, Copy, FilePlus2, Plus, Trash2, Users } from 'lucide-react';
import type {
  BillingMode,
  DocumentDraft,
  DocumentStatus,
  DocumentType,
  ItemPricingMode,
  LineItem,
  PackagePricingMode,
  SavedDocument,
} from '../types';
import {
  calculateDocumentTotals,
  calculateItemSubtotal,
  formatDOP,
  isIncludedItem,
  parseNumericQuantity,
} from '../utils/calculations';
import { formatTimestampDMY } from '../utils/dates';

interface DocumentEditorProps {
  draft: DocumentDraft;
  editingDoc: SavedDocument | null;
  previewFolio: string;
  dirty: boolean;
  onChange: (updater: (prev: DocumentDraft) => DocumentDraft) => void;
  onNewDoc: () => void;
  onDuplicateEditing: () => void;
}

export function DocumentEditor({
  draft,
  editingDoc,
  previewFolio,
  dirty,
  onChange,
  onNewDoc,
  onDuplicateEditing,
}: DocumentEditorProps) {
  const totals = calculateDocumentTotals(draft);

  function setField<K extends keyof DocumentDraft>(key: K, value: DocumentDraft[K]) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  function addItem(pricingMode: ItemPricingMode, price = 0, quantity = '1') {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: '',
      pricingMode,
      quantity,
      price,
    };
    onChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    onChange((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(id: string) {
    onChange((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  function applyFiftyPercentDeposit() {
    const half = Math.round(totals.grandTotal * 50) / 100;
    setField('deposit', half);
  }

  function adjustUnitQuantity(item: LineItem, delta: number) {
    const current = parseFloat(item.quantity) || 0;
    const next = Math.max(0, current + delta);
    updateItem(item.id, { quantity: String(next) });
  }

  function switchPackagePricingMode(nextMode: PackagePricingMode) {
    onChange((prev) => {
      const currentMode: PackagePricingMode =
        prev.packagePricingMode === 'general' ? 'general' : 'individual';
      if (currentMode === nextMode) return prev;

      const guests = Math.max(0, Math.floor(Number(prev.guestCount) || 0));
      if (nextMode === 'general') {
        const computedTotal = Math.round(guests * (prev.pricePerPerson || 0) * 100) / 100;
        const nextGeneral =
          computedTotal > 0 ? computedTotal : Math.max(0, prev.packageGeneralPrice || 0);
        return {
          ...prev,
          packagePricingMode: 'general',
          packageGeneralPrice: nextGeneral,
        };
      }

      const generalTotal = Math.max(0, prev.packageGeneralPrice || 0);
      const computedPerPerson =
        guests > 0 && generalTotal > 0
          ? Math.round((generalTotal / guests) * 100) / 100
          : prev.pricePerPerson;
      return {
        ...prev,
        packagePricingMode: 'individual',
        pricePerPerson: computedPerPerson,
      };
    });
  }

  function convertPerPersonToGeneral(item: LineItem) {
    const subtotal = calculateItemSubtotal(item);
    updateItem(item.id, {
      pricingMode: 'general',
      price: subtotal,
    });
  }

  function convertGeneralToPerPerson(item: LineItem) {
    const qty = parseNumericQuantity(item.quantity);
    if (qty <= 0) return;
    const perPersonPrice = Math.round((item.price / qty) * 100) / 100;
    updateItem(item.id, {
      pricingMode: 'per_person',
      quantity: String(qty),
      price: perPersonPrice,
    });
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 xl:pb-24">
      {/* Simple, Reassuring Status Bar */}
      <div
        data-testid="editor-status-banner"
        className={`rounded-2xl sm:rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 ${
          editingDoc
            ? 'bg-[#23262d] border-[#bb86fc]/55'
            : 'bg-[#1b1d22] border-[#2e323c]'
        }`}
      >
        <div className="min-w-0">
          {editingDoc ? (
            <>
              <p className="text-xs font-semibold text-[#bb86fc]">
                Editando <span className="font-mono-num text-white">{editingDoc.folio}</span>
                {dirty && <span className="text-[#a1a7b3] font-normal"> · Sin guardar</span>}
              </p>
              <p className="text-[11px] text-[#9aa1ae] mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#25d366] shrink-0" aria-hidden="true" />
                <span className="truncate">
                  Respaldado automáticamente · {formatTimestampDMY(editingDoc.updatedAt)}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#64b5f6]">
                {draft.type === 'factura' ? 'Nueva Factura' : 'Nueva Cotización'} ·{' '}
                <span className="font-mono-num text-white">{previewFolio}</span>
              </p>
              <p className="text-[11px] text-[#9aa1ae] mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#25d366] shrink-0" aria-hidden="true" />
                <span>Tu borrador se guarda solo aunque cierres el navegador</span>
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {editingDoc && (
            <button
              type="button"
              onClick={onDuplicateEditing}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl sm:rounded-lg bg-[#1b1d22] hover:bg-[#2c303a] border border-[#343944] text-xs font-medium text-[#e4e7ec] px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Duplicar</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNewDoc}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl sm:rounded-lg bg-[#1b1d22] hover:bg-[#2c303a] border border-[#343944] text-xs font-medium text-[#e4e7ec] px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      {/* Step 1: Document Type & Client Details (Most natural starting point) */}
      <section className="rounded-2xl sm:rounded-xl bg-[#1b1d22] border border-[#2a2e37] p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">1. Documento y cliente</h3>
          <div className="w-32">
            <label htmlFor="doc-status" className="sr-only">
              Estado del documento
            </label>
            <select
              id="doc-status"
              value={draft.status}
              onChange={(e) => setField('status', e.target.value as DocumentStatus)}
              className="w-full min-h-[36px] rounded-lg bg-[#23262d] border border-[#343944] px-2.5 py-1 text-xs font-medium text-[#e4e7ec] focus:outline-none focus:border-[#1e88e5]"
            >
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="pagada">Pagada</option>
            </select>
          </div>
        </div>

        {/* Big Clear Cotización / Factura Toggle */}
        <div
          role="group"
          aria-label="Tipo de documento"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#121212] border border-[#2a2e37]"
        >
          {(
            [
              { value: 'cotizacion', label: 'Cotización' },
              { value: 'factura', label: 'Factura' },
            ] as { value: DocumentType; label: string }[]
          ).map((opt) => {
            const active = draft.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setField('type', opt.value)}
                className={`min-h-[44px] py-2 px-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#1e88e5] text-white'
                    : 'text-[#9aa1ae] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Client Inputs & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
          <div>
            <label
              htmlFor="client-name"
              className="block text-xs font-medium text-[#b5bcc7] mb-1.5"
            >
              Nombre del cliente
            </label>
            <input
              id="client-name"
              type="text"
              value={draft.clientName}
              onChange={(e) => setField('clientName', e.target.value)}
              placeholder="Ej. María Fernanda Pérez"
              className="w-full min-h-[46px] rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
            />
          </div>

          <div>
            <label
              htmlFor="client-info"
              className="block text-xs font-medium text-[#b5bcc7] mb-1.5"
            >
              Teléfono o evento
            </label>
            <input
              id="client-info"
              type="text"
              value={draft.clientInfo}
              onChange={(e) => setField('clientInfo', e.target.value)}
              placeholder="Ej. 809-555-0192 · Cumpleaños"
              className="w-full min-h-[46px] rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 items-end">
            <div>
              <label
                htmlFor="issue-date"
                className="block text-xs font-medium text-[#b5bcc7] mb-1.5 whitespace-nowrap"
              >
                Fecha de emisión
              </label>
              <input
                id="issue-date"
                type="date"
                value={draft.issueDate}
                onChange={(e) => setField('issueDate', e.target.value)}
                className="w-full min-h-[46px] rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-2.5 sm:px-3 py-2.5 text-sm text-white tabular-nums focus:outline-none focus:border-[#1e88e5] [color-scheme:dark]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <label
                  htmlFor="delivery-date"
                  className="block text-xs font-medium text-[#b5bcc7] whitespace-nowrap"
                >
                  Fecha de entrega
                </label>
                {draft.deliveryDate && (
                  <button
                    type="button"
                    onClick={() => setField('deliveryDate', '')}
                    className="text-[11px] text-[#8f96a3] hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <input
                id="delivery-date"
                type="date"
                value={draft.deliveryDate}
                onChange={(e) => setField('deliveryDate', e.target.value)}
                className="w-full min-h-[46px] rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-2.5 sm:px-3 py-2.5 text-sm text-white tabular-nums focus:outline-none focus:border-[#1e88e5] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: How are we charging? */}
      <section className="rounded-2xl sm:rounded-xl bg-[#1b1d22] border border-[#2a2e37] p-4 sm:p-5 space-y-3.5">
        <div>
          <h3 className="text-sm font-semibold text-white">2. ¿Cómo vas a cobrar?</h3>
          <p className="text-xs text-[#8f96a3] mt-0.5">
            Elige si cobras cada plato por separado o un precio fijo por invitado.
          </p>
        </div>

        <div
          role="group"
          aria-label="Modo de cobro global"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#121212] border border-[#2a2e37]"
        >
          {(
            [
              { value: 'por_articulo', label: 'Por Artículo' },
              { value: 'por_persona', label: 'Por Persona' },
            ] as { value: BillingMode; label: string }[]
          ).map((opt) => {
            const active = draft.billingMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => setField('billingMode', opt.value)}
                className={`min-h-[44px] py-2 px-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#23262d] text-white border border-[#3d4452]'
                    : 'text-[#9aa1ae] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {draft.billingMode === 'por_persona' && (() => {
          const packageMode: PackagePricingMode =
            draft.packagePricingMode === 'general' ? 'general' : 'individual';
          const generalPrice = draft.packageGeneralPrice ?? 0;
          const equivalentPerPerson =
            draft.guestCount > 0 && generalPrice > 0
              ? Math.round((generalPrice / draft.guestCount) * 100) / 100
              : 0;

          return (
            <div className="rounded-xl bg-[#23262d] border border-[#343944] p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#e4e7ec]">
                  <Users className="w-4 h-4 text-[#2dd4bf]" aria-hidden="true" />
                  <span>Paquete base</span>
                </div>
                <span className="font-mono-num text-sm font-bold text-[#64b5f6]">
                  {formatDOP(totals.packageSubtotal)}
                </span>
              </div>

              {/* Package pricing style: Individual vs General */}
              <div
                role="group"
                aria-label="Cómo mostrar el precio del paquete"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#121212] border border-[#2e323c]"
              >
                <button
                  type="button"
                  aria-pressed={packageMode === 'individual'}
                  onClick={() => switchPackagePricingMode('individual')}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    packageMode === 'individual'
                      ? 'bg-[#0f766e] text-white'
                      : 'text-[#8f96a3] hover:text-white'
                  }`}
                >
                  Individual (c/u)
                </button>
                <button
                  type="button"
                  aria-pressed={packageMode === 'general'}
                  onClick={() => switchPackagePricingMode('general')}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    packageMode === 'general'
                      ? 'bg-[#bb86fc] text-[#121212]'
                      : 'text-[#8f96a3] hover:text-white'
                  }`}
                >
                  General (Total)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="guest-count" className="block text-xs text-[#b5bcc7] mb-1">
                    Cantidad de personas
                  </label>
                  <input
                    id="guest-count"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={draft.guestCount === 0 ? '' : draft.guestCount}
                    onChange={(e) =>
                      setField('guestCount', Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    placeholder="10"
                    className="w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-[#1e88e5]"
                  />
                </div>

                {packageMode === 'general' ? (
                  <div>
                    <label
                      htmlFor="package-general-price"
                      className="block text-xs text-[#b5bcc7] mb-1"
                    >
                      Costo general (RD$)
                    </label>
                    <input
                      id="package-general-price"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={generalPrice === 0 ? '' : generalPrice}
                      onChange={(e) =>
                        setField(
                          'packageGeneralPrice',
                          Math.max(0, parseFloat(e.target.value) || 0),
                        )
                      }
                      placeholder="4000"
                      className="w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-[#bb86fc]"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="price-per-person"
                      className="block text-xs text-[#b5bcc7] mb-1"
                    >
                      Precio por persona (RD$)
                    </label>
                    <input
                      id="price-per-person"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={draft.pricePerPerson === 0 ? '' : draft.pricePerPerson}
                      onChange={(e) =>
                        setField('pricePerPerson', Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      placeholder="400"
                      className="w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-[#2dd4bf]"
                    />
                  </div>
                )}
              </div>

              {packageMode === 'general' && equivalentPerPerson > 0 && (
                <p className="text-[11px] text-[#d0a8ff] leading-relaxed">
                  Equivale a <span className="font-mono-num font-semibold">{formatDOP(equivalentPerPerson)}</span> / pers. (en la factura solo se muestra el total general).
                </p>
              )}

              <p className="text-[11px] text-[#9aa1ae] leading-relaxed">
                Los platos con precio en 0 salen como <strong className="text-white">Incluido</strong>;
                puedes mezclar extras <strong className="text-[#2dd4bf]">x Persona</strong>,{' '}
                <strong className="text-[#d0a8ff]">General</strong> o{' '}
                <strong className="text-[#64b5f6]">x Unidad</strong> abajo.
              </p>
            </div>
          );
        })()}
      </section>

      {/* Step 3: Products / Dishes */}
      <section className="rounded-2xl sm:rounded-xl bg-[#1b1d22] border border-[#2a2e37] p-4 sm:p-5 space-y-3.5">
        <div>
          <h3 className="text-sm font-semibold text-white">
            3. {draft.billingMode === 'por_persona' ? 'Platos del menú y extras' : 'Productos, estaciones o platos'}
          </h3>
          <p className="text-xs text-[#8f96a3] mt-0.5 leading-relaxed">
            En cada fila puedes elegir <strong className="text-[#2dd4bf]">x Persona</strong> (individual),{' '}
            <strong className="text-[#d0a8ff]">General</strong> (precio fijo total) o{' '}
            <strong className="text-[#64b5f6]">x Unidad</strong>, y mezclarlos en la misma cotización.
          </p>
        </div>

        <div className="space-y-3" data-testid="items-list">
          {draft.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#343944] py-6 px-4 text-center">
              <p className="text-xs text-[#8f96a3]">
                Toca uno de los botones de abajo para agregar tu primer plato o estación.
              </p>
            </div>
          ) : (
            draft.items.map((item, idx) => {
              const isGeneral = item.pricingMode === 'general';
              const isPerPerson = item.pricingMode === 'per_person';
              const isUnit = !isGeneral && !isPerPerson;
              const included = isIncludedItem(item, draft.billingMode);
              const subtotal = calculateItemSubtotal(item);
              const numericQty = parseNumericQuantity(item.quantity);
              const canConvertToGeneral = isPerPerson && numericQty > 0 && item.price > 0;
              const canConvertToPerPerson =
                isGeneral && numericQty > 0 && item.price > 0 && /^\d+([.,]\d+)?$/.test(item.quantity.trim());
              const equivalentPerPerson = canConvertToPerPerson
                ? Math.round((item.price / numericQty) * 100) / 100
                : 0;

              return (
                <div
                  key={item.id}
                  data-testid={`item-row-${idx}`}
                  className={`rounded-xl bg-[#23262d] border p-3.5 space-y-3 transition-colors ${
                    isGeneral
                      ? 'border-[#bb86fc]/55'
                      : isPerPerson
                        ? 'border-[#2dd4bf]/50'
                        : 'border-[#343944]'
                  }`}
                >
                  {/* Tier 1: Description + Delete */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`item-desc-${item.id}`} className="sr-only">
                        Descripción del artículo {idx + 1}
                      </label>
                      <input
                        id={`item-desc-${item.id}`}
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder={
                          isPerPerson
                            ? 'Ej. Bar de chocolate, Estación de cafés...'
                            : isGeneral
                              ? 'Ej. Bar de chocolate (general), Arroz con maíz...'
                              : 'Ej. Croquetas de pollo, Kipes...'
                        }
                        className="w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Eliminar fila ${idx + 1}`}
                      className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl text-[#8f96a3] hover:text-[#cf6679] hover:bg-[#cf6679]/10 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Tier 1.5: 3-Way Mode Selector (x Unidad | x Persona | General) */}
                  <div
                    role="group"
                    aria-label={`Modo de cálculo fila ${idx + 1}`}
                    className="grid grid-cols-3 gap-1 rounded-xl sm:rounded-lg bg-[#121212] border border-[#2e323c] p-0.5"
                  >
                    <button
                      type="button"
                      aria-pressed={isUnit}
                      onClick={() => updateItem(item.id, { pricingMode: 'unit' })}
                      className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        isUnit
                          ? 'bg-[#1e88e5] text-white'
                          : 'text-[#8f96a3] hover:text-white'
                      }`}
                    >
                      x Unidad
                    </button>
                    <button
                      type="button"
                      aria-pressed={isPerPerson}
                      onClick={() => updateItem(item.id, { pricingMode: 'per_person' })}
                      className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        isPerPerson
                          ? 'bg-[#0f766e] text-white'
                          : 'text-[#8f96a3] hover:text-white'
                      }`}
                    >
                      x Persona
                    </button>
                    <button
                      type="button"
                      aria-pressed={isGeneral}
                      onClick={() => updateItem(item.id, { pricingMode: 'general' })}
                      className={`min-h-[36px] px-2 py-1.5 text-xs font-semibold rounded-lg sm:rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        isGeneral
                          ? 'bg-[#bb86fc] text-[#121212]'
                          : 'text-[#8f96a3] hover:text-white'
                      }`}
                    >
                      General
                    </button>
                  </div>

                  {/* Tier 2: Quantity / People + Price + Live Subtotal */}
                  <div className="grid grid-cols-12 gap-2.5 items-end">
                    <div className="col-span-6 sm:col-span-4">
                      <label
                        htmlFor={`item-qty-${item.id}`}
                        className="block text-[11px] font-medium text-[#b5bcc7] mb-1"
                      >
                        {isGeneral
                          ? 'Personas / Porciones'
                          : isPerPerson
                            ? 'Personas'
                            : 'Cantidad'}
                      </label>
                      {isGeneral ? (
                        <input
                          id={`item-qty-${item.id}`}
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                          placeholder="10 o 2 bandejas"
                          className="w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white placeholder-[#6b7280] tabular-nums focus:outline-none focus:border-[#bb86fc]"
                        />
                      ) : (
                        <div
                          className={`flex items-center rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] overflow-hidden ${
                            isPerPerson
                              ? 'focus-within:border-[#2dd4bf]'
                              : 'focus-within:border-[#1e88e5]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => adjustUnitQuantity(item, -1)}
                            aria-label={`Disminuir cantidad fila ${idx + 1}`}
                            className="min-h-[42px] w-9 flex items-center justify-center text-[#a1a7b3] hover:text-white hover:bg-[#2a2e37] text-base font-medium cursor-pointer shrink-0"
                          >
                            −
                          </button>
                          <input
                            id={`item-qty-${item.id}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                            placeholder={isPerPerson ? '10' : '1'}
                            className="w-full min-w-0 bg-transparent text-center py-2 text-base sm:text-sm text-white tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustUnitQuantity(item, 1)}
                            aria-label={`Aumentar cantidad fila ${idx + 1}`}
                            className="min-h-[42px] w-9 flex items-center justify-center text-[#a1a7b3] hover:text-white hover:bg-[#2a2e37] text-base font-medium cursor-pointer shrink-0"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-4">
                      <label
                        htmlFor={`item-price-${item.id}`}
                        className="block text-[11px] font-medium text-[#b5bcc7] mb-1"
                      >
                        {isGeneral
                          ? 'Precio fijo (RD$)'
                          : isPerPerson
                            ? 'Precio / pers. (RD$)'
                            : 'Precio c/u (RD$)'}
                      </label>
                      <input
                        id={`item-price-${item.id}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={item.price === 0 ? '' : item.price}
                        onChange={(e) =>
                          updateItem(item.id, {
                            price: Math.max(0, parseFloat(e.target.value) || 0),
                          })
                        }
                        placeholder={
                          draft.billingMode === 'por_persona'
                            ? '0 = Incluido'
                            : isPerPerson
                              ? '400'
                              : isGeneral
                                ? '4000'
                                : '0.00'
                        }
                        className={`w-full min-h-[44px] rounded-xl sm:rounded-lg bg-[#1b1d22] border border-[#343944] px-3 py-2 text-base sm:text-sm text-white placeholder-[#6b7280] tabular-nums focus:outline-none ${
                          isGeneral
                            ? 'focus:border-[#bb86fc]'
                            : isPerPerson
                              ? 'focus:border-[#2dd4bf]'
                              : 'focus:border-[#1e88e5]'
                        }`}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-4 flex sm:block items-center justify-between pt-2 sm:pt-0 border-t border-[#2e323c] sm:border-0 sm:text-right sm:pb-2">
                      <span className="text-[11px] text-[#8f96a3] sm:block sm:mb-0.5">
                        {included
                          ? 'Incluido en paquete'
                          : isGeneral
                            ? 'Total fijo (sin multiplicar)'
                            : isPerPerson
                              ? `${numericQty} pers. × ${formatDOP(item.price)}`
                              : `${numericQty} × ${formatDOP(item.price)}`}
                      </span>
                      {included ? (
                        <span className="text-xs font-semibold text-[#64b5f6]">Incluido</span>
                      ) : (
                        <span
                          className={`font-mono-num text-sm font-semibold ${
                            isGeneral
                              ? 'text-[#d0a8ff]'
                              : isPerPerson
                                ? 'text-[#2dd4bf]'
                                : 'text-white'
                          }`}
                        >
                          {formatDOP(subtotal)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Conversion Helper between Individual (x Persona) and General */}
                  {(canConvertToGeneral || canConvertToPerPerson) && !included && (
                    <div className="pt-2 border-t border-[#2e323c]/80 flex items-center justify-between gap-2">
                      {canConvertToGeneral ? (
                        <button
                          type="button"
                          data-testid={`convert-to-general-${idx}`}
                          onClick={() => convertPerPersonToGeneral(item)}
                          className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#bb86fc]/12 hover:bg-[#bb86fc]/20 border border-[#bb86fc]/35 text-[#d0a8ff] text-xs font-medium px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            Pasar a General ({formatDOP(subtotal)})
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`convert-to-per-person-${idx}`}
                          onClick={() => convertGeneralToPerPerson(item)}
                          className="w-full min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f766e]/20 hover:bg-[#0f766e]/30 border border-[#2dd4bf]/35 text-[#5eead4] text-xs font-medium px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            Ver por persona ({formatDOP(equivalentPerPerson)} c/u)
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick-Add Touch Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() =>
              addItem(
                'per_person',
                0,
                String(draft.billingMode === 'por_persona' ? draft.guestCount || 10 : 10),
              )
            }
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-lg bg-[#0f766e]/20 hover:bg-[#0f766e]/35 border border-[#2dd4bf]/40 text-[#5eead4] text-xs font-semibold px-3.5 py-2.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Por persona</span>
          </button>

          <button
            type="button"
            onClick={() =>
              addItem(
                'general',
                0,
                String(draft.billingMode === 'por_persona' ? draft.guestCount || 10 : 10),
              )
            }
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-lg bg-[#bb86fc]/15 hover:bg-[#bb86fc]/25 border border-[#bb86fc]/40 text-[#d0a8ff] text-xs font-semibold px-3.5 py-2.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Costo general</span>
          </button>

          <button
            type="button"
            onClick={() => addItem('unit', 0, '1')}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-lg bg-[#1e88e5]/15 hover:bg-[#1e88e5]/25 border border-[#1e88e5]/40 text-[#64b5f6] text-xs font-semibold px-3.5 py-2.5 transition-colors cursor-pointer whitespace-nowrap ${
              draft.billingMode === 'por_persona' ? '' : 'col-span-2 sm:col-span-1'
            }`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Por unidad</span>
          </button>

          {draft.billingMode === 'por_persona' && (
            <button
              type="button"
              onClick={() => addItem('unit', 0, String(draft.guestCount || 1))}
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-lg bg-[#23262d] hover:bg-[#2c303a] border border-[#343944] text-[#d4d8e0] text-xs font-semibold px-3.5 py-2.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Plato incluido</span>
            </button>
          )}
        </div>
      </section>

      {/* Step 4: Deposit & Terms */}
      <section className="rounded-2xl sm:rounded-xl bg-[#1b1d22] border border-[#2a2e37] p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">4. Abono y condiciones</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="doc-deposit"
                className="block text-xs font-medium text-[#b5bcc7]"
              >
                Abono recibido (RD$)
              </label>
              {totals.grandTotal > 0 && (
                <button
                  type="button"
                  onClick={applyFiftyPercentDeposit}
                  className="text-xs font-semibold text-[#64b5f6] hover:text-white py-0.5 cursor-pointer"
                >
                  Poner 50%
                </button>
              )}
            </div>
            <input
              id="doc-deposit"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={draft.deposit === 0 ? '' : draft.deposit}
              onChange={(e) =>
                setField('deposit', Math.max(0, parseFloat(e.target.value) || 0))
              }
              placeholder="0.00"
              className="w-full min-h-[46px] rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-3.5 py-2.5 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-[#1e88e5]"
            />
          </div>

          <div className="rounded-xl sm:rounded-lg bg-[#23262d] border border-[#2e323c] px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-[#8f96a3]">Total general</p>
              <p className="font-mono-num text-sm font-semibold text-white">
                {formatDOP(totals.grandTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#8f96a3]">Falta por pagar</p>
              <p className="font-mono-num text-sm font-bold text-[#64b5f6]">
                {formatDOP(totals.balance)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="doc-notes"
            className="block text-xs font-medium text-[#b5bcc7] mb-1.5"
          >
            Términos y condiciones
          </label>
          <textarea
            id="doc-notes"
            rows={3}
            value={draft.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Condiciones de reserva, entrega o pago..."
            className="w-full rounded-xl sm:rounded-lg bg-[#23262d] border border-[#343944] px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-[#6b7280] leading-relaxed focus:outline-none focus:border-[#1e88e5] resize-y"
          />
        </div>
      </section>
    </div>
  );
}
