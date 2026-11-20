import { useState } from 'react';
import { Copy, FilePlus2, Search, Trash2, X } from 'lucide-react';
import type { DocumentStatus, SavedDocument } from '../types';
import { calculateDocumentTotals, formatDOP } from '../utils/calculations';
import { formatDateCompactDMY } from '../utils/dates';

type TypeFilter = 'all' | 'factura' | 'cotizacion';

interface HistorySidebarProps {
  documents: SavedDocument[];
  loading: boolean;
  activeDocId: string | null;
  isAdmin: boolean;
  onSelectDoc: (doc: SavedDocument) => void;
  onNewDoc: () => void;
  onDuplicateDoc: (doc: SavedDocument) => Promise<void>;
  onDeleteDoc: (doc: SavedDocument) => Promise<void>;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const STATUS_META: Record<DocumentStatus, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'text-[#a1a7b3]' },
  enviada: { label: 'Enviada', className: 'text-[#64b5f6]' },
  pagada: { label: 'Pagada', className: 'text-[#25d366]' },
};

export function HistorySidebar({
  documents,
  loading,
  activeDocId,
  isAdmin,
  onSelectDoc,
  onNewDoc,
  onDuplicateDoc,
  onDeleteDoc,
  mobileOpen,
  onCloseMobile,
}: HistorySidebarProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = documents.filter((doc) => {
    if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
    if (!normalizedQuery) return true;
    return (
      doc.folio.toLowerCase().includes(normalizedQuery) ||
      doc.clientName.toLowerCase().includes(normalizedQuery) ||
      doc.clientInfo.toLowerCase().includes(normalizedQuery)
    );
  });

  async function handleDuplicate(doc: SavedDocument) {
    setBusyId(doc.id);
    try {
      await onDuplicateDoc(doc);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete(doc: SavedDocument) {
    setBusyId(doc.id);
    try {
      await onDeleteDoc(doc);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1b1d22] border-r border-[#2a2e37]">
      <div className="p-4 border-b border-[#2a2e37] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">Historial</h2>
            <p className="text-xs text-[#8f96a3] tabular-nums">
              {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onNewDoc();
                onCloseMobile();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e88e5] hover:bg-[#1976d2] text-white text-xs font-semibold px-3 py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Nuevo</span>
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Cerrar historial"
              className="lg:hidden p-2 rounded-lg text-[#a1a7b3] hover:text-white hover:bg-[#23262d] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-[#7c8391] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente o folio..."
            aria-label="Buscar documentos por cliente o folio"
            className="w-full rounded-lg bg-[#23262d] border border-[#343944] pl-8 pr-3 py-2 text-xs text-white placeholder-[#7c8391] focus:outline-none focus:border-[#1e88e5] transition-colors"
          />
        </div>

        {/* Segmented Type Filter */}
        <div
          role="group"
          aria-label="Filtrar por tipo de documento"
          className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#121212] border border-[#2a2e37]"
        >
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'factura', label: 'Facturas' },
              { key: 'cotizacion', label: 'Cotiz.' },
            ] as const
          ).map((tab) => {
            const active = typeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTypeFilter(tab.key)}
                aria-pressed={active}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#23262d] text-white'
                    : 'text-[#8f96a3] hover:text-[#d4d8e0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="history-list">
        {loading ? (
          <div className="space-y-2.5 p-1">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-24 rounded-lg bg-[#23262d] border border-[#2e323c] animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-2">
            <p className="text-sm font-medium text-[#d4d8e0]">
              {documents.length === 0 ? 'Sin documentos guardados' : 'Sin coincidencias'}
            </p>
            <p className="text-xs text-[#8f96a3]">
              {documents.length === 0
                ? 'Crea y guarda tu primera cotización o factura.'
                : 'Prueba otro término de búsqueda o filtro.'}
            </p>
          </div>
        ) : (
          filtered.map((doc) => {
            const isActive = activeDocId === doc.id;
            const totals = calculateDocumentTotals(doc);
            const statusInfo = STATUS_META[doc.status] || STATUS_META.borrador;
            const isConfirmingDelete = confirmDeleteId === doc.id;

            return (
              <article
                key={doc.id}
                data-testid={`history-item-${doc.folio}`}
                className={`rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-[#23262d] border-[#bb86fc]'
                    : 'bg-[#23262d]/70 border-[#2e323c] hover:border-[#3f4554]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectDoc(doc);
                    onCloseMobile();
                  }}
                  className="w-full text-left p-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bb86fc] rounded-t-lg"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-num text-xs font-semibold text-white">
                      {doc.folio}
                    </span>
                    <span className={`text-[11px] font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-[#f4f4f6] truncate">
                    {doc.clientName || 'Cliente sin nombre'}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-[#8f96a3]">
                    <span className="truncate">
                      {doc.type === 'factura' ? 'Factura' : 'Cotización'} ·{' '}
                      <span className="tabular-nums">
                        {formatDateCompactDMY(doc.issueDate, 'Sin fecha')}
                      </span>
                    </span>
                    <span className="font-mono-num font-semibold text-[#e4e7ec] shrink-0">
                      {formatDOP(totals.grandTotal)}
                    </span>
                  </div>

                  {isActive && (
                    <p className="mt-1.5 text-[11px] font-medium text-[#bb86fc]">
                      Editando ahora
                    </p>
                  )}
                </button>

                {/* Compact action bar */}
                <div className="px-3 py-1.5 border-t border-[#2e323c]/80 flex items-center justify-between gap-2">
                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="text-[11px] text-[#f3a8b5]">¿Eliminar {doc.folio}?</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() => handleConfirmDelete(doc)}
                          className="text-[11px] font-semibold text-[#121212] bg-[#cf6679] hover:bg-[#df788a] px-2 py-0.5 rounded cursor-pointer"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-[#a1a7b3] hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => handleDuplicate(doc)}
                        aria-label={`Duplicar ${doc.folio}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#a1a7b3] hover:text-white py-1 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3" aria-hidden="true" />
                        <span>Duplicar</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          disabled={busyId === doc.id}
                          onClick={() => setConfirmDeleteId(doc.id)}
                          aria-label={`Eliminar ${doc.folio}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#a1a7b3] hover:text-[#cf6679] py-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                          <span>Eliminar</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop docked sidebar */}
      <aside
        aria-label="Historial de documentos"
        className="no-print hidden lg:block w-[280px] shrink-0 h-[calc(100vh-56px)] sticky top-14"
      >
        {sidebarContent}
      </aside>

      {/* Mobile bottom sheet drawer for comfortable one-handed thumb browsing */}
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-50 lg:hidden flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Historial de documentos"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg h-[84vh] rounded-t-3xl overflow-hidden border-t border-[#343944] bg-[#1b1d22] flex flex-col shadow-2xl">
            <div
              className="w-10 h-1.5 rounded-full bg-[#3f4554] mx-auto mt-3 mb-1 shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 min-h-0">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
