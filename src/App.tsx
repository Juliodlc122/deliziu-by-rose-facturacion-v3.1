import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileDown,
  FileText,
  History,
  ImageDown,
  LogOut,
  MessageCircle,
  PenSquare,
  Printer,
  Save,
  Share2,
  Users,
} from 'lucide-react';
import { BUSINESS_INFO } from './types';
import type { AuthUser, DocumentDraft, SavedDocument } from './types';
import { api, getStoredToken, setStoredToken } from './utils/api';
import type { NextFolios } from './utils/api';
import { calculateDocumentTotals, formatDOP } from './utils/calculations';
import { getTodayIsoLocal } from './utils/dates';
import { exportSheetToPdf, exportSheetToPng } from './utils/exportDoc';
import { buildWhatsAppSummary } from './utils/whatsapp';
import {
  clearWorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState,
} from './utils/workspaceStorage';
import { BrandLogo } from './components/BrandLogo';
import { DocumentEditor } from './components/DocumentEditor';
import { HistorySidebar } from './components/HistorySidebar';
import { InvoiceSheet } from './components/InvoiceSheet';
import { LoginScreen } from './components/LoginScreen';
import { MobileExportSheet } from './components/MobileExportSheet';
import { ToastContainer } from './components/ToastContainer';
import type { ToastItem } from './components/ToastContainer';
import { UsersModal } from './components/UsersModal';
import { WhatsAppModal } from './components/WhatsAppModal';

function createEmptyDraft(): DocumentDraft {
  return {
    type: 'cotizacion',
    status: 'borrador',
    billingMode: 'por_articulo',
    packagePricingMode: 'individual',
    packageGeneralPrice: 0,
    clientName: '',
    clientInfo: '',
    issueDate: getTodayIsoLocal(),
    deliveryDate: '',
    guestCount: 20,
    pricePerPerson: 0,
    items: [
      {
        id: `item-${Date.now()}-1`,
        description: '',
        pricingMode: 'unit',
        quantity: '1',
        price: 0,
      },
    ],
    deposit: 0,
    notes: BUSINESS_INFO.defaultNotes,
  };
}

function docToDraft(doc: SavedDocument): DocumentDraft {
  return {
    type: doc.type,
    status: doc.status,
    billingMode: doc.billingMode,
    packagePricingMode: doc.packagePricingMode === 'general' ? 'general' : 'individual',
    packageGeneralPrice: typeof doc.packageGeneralPrice === 'number' ? doc.packageGeneralPrice : 0,
    clientName: doc.clientName,
    clientInfo: doc.clientInfo,
    issueDate: doc.issueDate,
    deliveryDate: doc.deliveryDate,
    guestCount: doc.guestCount,
    pricePerPerson: doc.pricePerPerson,
    items: doc.items.map((it) => ({ ...it })),
    deposit: doc.deposit,
    notes: doc.notes,
  };
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [nextFolios, setNextFolios] = useState<NextFolios>({
    cotizacion: 'COT-0001',
    factura: 'FAC-0001',
  });

  const [editingDoc, setEditingDoc] = useState<SavedDocument | null>(null);
  const [draft, setDraft] = useState<DocumentDraft>(() => createEmptyDraft());
  const [dirty, setDirty] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'png' | 'whatsapp' | 'print' | null>(null);

  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    open: boolean;
    message: string;
    folio: string;
  }>({ open: false, message: '', folio: '' });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const notify = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Verify saved session on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    api
      .me()
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  // Restore persisted workspace & load documents once authenticated
  useEffect(() => {
    if (!user) {
      setWorkspaceReady(false);
      return;
    }

    const restored = loadWorkspaceState(user.id);
    if (restored) {
      setDraft(restored.draft);
      setEditingDoc(restored.editingDocSnapshot);
      setDirty(restored.dirty);
      setMobileTab(restored.mobileTab);
    } else {
      setDraft(createEmptyDraft());
      setEditingDoc(null);
      setDirty(false);
    }
    setWorkspaceReady(true);

    let cancelled = false;
    setDocsLoading(true);
    api
      .listDocuments()
      .then((res) => {
        if (cancelled) return;
        setDocuments(res.documents);
        setNextFolios(res.nextFolios);

        // Reconcile restored editing document against latest server record
        if (restored?.editingDocId) {
          const serverDoc = res.documents.find((d) => d.id === restored.editingDocId);
          if (serverDoc) {
            setEditingDoc(serverDoc);
            if (!restored.dirty) {
              setDraft(docToDraft(serverDoc));
            }
          } else {
            // Document was deleted on server; keep the draft as a new unsaved document so work is never lost
            setEditingDoc(null);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as Error & { status?: number })?.status;
        if (status === 401) {
          setStoredToken(null);
          setUser(null);
        } else {
          notify(
            err instanceof Error ? err.message : 'No se pudo cargar el historial.',
            'error',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, notify]);

  // Continuously persist active draft, editingDoc, and tab in localStorage so browser restarts never lose work
  useEffect(() => {
    if (!user || !workspaceReady) return;
    saveWorkspaceState(user.id, {
      version: 1,
      draft,
      editingDocId: editingDoc?.id ?? null,
      editingDocSnapshot: editingDoc,
      dirty,
      mobileTab,
      savedAt: new Date().toISOString(),
    });
  }, [user, workspaceReady, draft, editingDoc, dirty, mobileTab]);

  const handleDraftChange = useCallback(
    (updater: (prev: DocumentDraft) => DocumentDraft) => {
      setDraft((prev) => updater(prev));
      setDirty(true);
    },
    [],
  );

  async function handleLogin(username: string, password: string) {
    const res = await api.login(username, password);
    setStoredToken(res.token);
    setUser(res.user);
    notify(`Bienvenido, ${res.user.name}.`, 'success');
  }

  function handleLogout() {
    if (user) {
      clearWorkspaceState(user.id);
    }
    setStoredToken(null);
    setUser(null);
    setDocuments([]);
    setEditingDoc(null);
    setDraft(createEmptyDraft());
    setDirty(false);
    setWorkspaceReady(false);
    setUsersModalOpen(false);
    setHistoryDrawerOpen(false);
    setExportSheetOpen(false);
  }

  function handleNewDocument() {
    setEditingDoc(null);
    setDraft(createEmptyDraft());
    setDirty(false);
    setMobileTab('editor');
    notify('Listo para crear un nuevo documento.', 'info');
  }

  function handleSelectDocument(doc: SavedDocument) {
    setEditingDoc(doc);
    setDraft(docToDraft(doc));
    setDirty(false);
  }

  async function saveCurrentDocument(silent = false): Promise<SavedDocument | null> {
    setSaving(true);
    try {
      if (editingDoc) {
        const res = await api.updateDocument(editingDoc.id, draft);
        setEditingDoc(res.document);
        setDirty(false);
        setNextFolios(res.nextFolios);
        setDocuments((prev) => {
          const rest = prev.filter((d) => d.id !== res.document.id);
          return [res.document, ...rest];
        });
        if (!silent) {
          notify(`Cambios guardados en ${res.document.folio}.`, 'success');
        }
        return res.document;
      } else {
        const res = await api.createDocument(draft);
        setEditingDoc(res.document);
        setDirty(false);
        setNextFolios(res.nextFolios);
        setDocuments((prev) => [res.document, ...prev]);
        if (!silent) {
          notify(`Documento guardado como ${res.document.folio}.`, 'success');
        }
        return res.document;
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al guardar el documento.', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicateDocument(doc: SavedDocument) {
    try {
      const res = await api.duplicateDocument(doc.id);
      setNextFolios(res.nextFolios);
      setDocuments((prev) => [res.document, ...prev]);
      setEditingDoc(res.document);
      setDraft(docToDraft(res.document));
      setDirty(false);
      setMobileTab('editor');
      notify(`Duplicado como ${res.document.folio}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo duplicar.', 'error');
    }
  }

  async function handleDeleteDocument(doc: SavedDocument) {
    try {
      await api.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (editingDoc?.id === doc.id) {
        setEditingDoc(null);
        setDraft(createEmptyDraft());
        setDirty(false);
      }
      notify(`Documento ${doc.folio} eliminado.`, 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error');
    }
  }

  async function ensurePreviewVisibleForCapture(): Promise<HTMLElement | null> {
    if (window.innerWidth < 1280 && mobileTab !== 'preview') {
      setMobileTab('preview');
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    } else {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return sheetRef.current;
  }

  async function handleExportPdf() {
    setExporting('pdf');
    try {
      const saved = await saveCurrentDocument(true);
      if (!saved) return;
      const el = await ensurePreviewVisibleForCapture();
      if (!el) throw new Error('Vista previa no disponible.');
      const filename = await exportSheetToPdf(el, saved.folio, saved.clientName);
      notify(`Guardado (${saved.folio}) y descargado ${filename}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al exportar PDF.', 'error');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPng() {
    setExporting('png');
    try {
      const saved = await saveCurrentDocument(true);
      if (!saved) return;
      const el = await ensurePreviewVisibleForCapture();
      if (!el) throw new Error('Vista previa no disponible.');
      const filename = await exportSheetToPng(el, saved.folio, saved.clientName);
      notify(`Guardado (${saved.folio}) y descargada imagen ${filename}.`, 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Error al exportar imagen PNG.', 'error');
    } finally {
      setExporting(null);
    }
  }

  async function handlePrint() {
    setExporting('print');
    try {
      const saved = await saveCurrentDocument(true);
      if (!saved) return;
      notify(`Guardado (${saved.folio}). Abriendo impresión...`, 'info');
      requestAnimationFrame(() => {
        window.print();
      });
    } finally {
      setExporting(null);
    }
  }

  async function handleWhatsApp() {
    setExporting('whatsapp');
    try {
      const saved = await saveCurrentDocument(true);
      if (!saved) return;
      const summary = buildWhatsAppSummary(docToDraft(saved), saved.folio);
      setWhatsAppModal({
        open: true,
        message: summary,
        folio: saved.folio,
      });
    } finally {
      setExporting(null);
    }
  }

  const previewFolio = editingDoc
    ? editingDoc.type === draft.type
      ? editingDoc.folio
      : nextFolios[draft.type]
    : nextFolios[draft.type];

  const liveTotals = calculateDocumentTotals(draft);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#a1a7b3]">
          <BrandLogo size="sm" />
          <span>Cargando {BUSINESS_INFO.brandName}...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const isAdmin = user.role === 'admin';
  const isBusy = saving || exporting !== null;

  return (
    <div className="min-h-screen bg-[#121212] text-[#f4f4f6] flex flex-col">
      {/* Top Navigation Bar: Compact 52px on mobile (live total at a glance) | 56px on desktop */}
      <header className="no-print sticky top-0 z-30 h-[52px] sm:h-14 bg-[#1b1d22]/95 backdrop-blur-md border-b border-[#2a2e37] px-3 sm:px-5 flex items-center justify-between gap-2.5">
        {/* Left Zone: Brand + Live Folio/Total on mobile */}
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size="sm" className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          <div className="min-w-0 leading-tight">
            <span className="hidden xl:inline font-brand-serif text-lg font-bold text-white tracking-tight whitespace-nowrap">
              {BUSINESS_INFO.brandName}
            </span>
            <div className="xl:hidden flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {draft.type === 'factura' ? 'Factura' : 'Cotización'}{' '}
                <span className="font-mono-num text-[#bb86fc]">{previewFolio}</span>
              </span>
              <span className="font-mono-num text-[11px] font-semibold text-[#64b5f6] truncate">
                {formatDOP(liveTotals.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Zone: Admin Users + Account & Logout (44px touch targets on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setUsersModalOpen(true)}
              aria-label="Gestionar usuarios"
              className="min-h-[40px] min-w-[40px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-lg bg-[#23262d] hover:bg-[#2d313b] border border-[#343944] text-xs font-medium text-[#e4e7ec] px-2.5 sm:px-3 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#bb86fc]" aria-hidden="true" />
              <span className="hidden sm:inline">Usuarios</span>
            </button>
          )}

          <div className="hidden md:flex flex-col text-right leading-tight">
            <span className="text-xs font-semibold text-white truncate max-w-[140px]">
              {user.username}
            </span>
            <span className="text-[11px] text-[#8f96a3]">
              {isAdmin ? 'Administrador' : 'Empleado'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="min-h-[40px] min-w-[40px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-xl sm:rounded-lg bg-[#23262d] hover:bg-[#cf6679]/15 border border-[#343944] hover:border-[#cf6679]/40 text-[#a1a7b3] hover:text-[#cf6679] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Layout: History Sidebar + Split Workspace */}
      <div className="flex-1 flex min-w-0">
        <HistorySidebar
          documents={documents}
          loading={docsLoading}
          activeDocId={editingDoc?.id ?? null}
          isAdmin={isAdmin}
          onSelectDoc={handleSelectDocument}
          onNewDoc={handleNewDocument}
          onDuplicateDoc={handleDuplicateDocument}
          onDeleteDoc={handleDeleteDocument}
          mobileOpen={historyDrawerOpen}
          onCloseMobile={() => setHistoryDrawerOpen(false)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 px-3.5 py-4 sm:p-6 max-w-[1520px] w-full mx-auto items-start">
            {/* Left Pane: Structured Editor */}
            <div
              className={`no-print xl:col-span-5 ${
                mobileTab === 'editor' ? 'block' : 'hidden xl:block'
              }`}
            >
              <DocumentEditor
                draft={draft}
                editingDoc={editingDoc}
                previewFolio={previewFolio}
                dirty={dirty}
                onChange={handleDraftChange}
                onNewDoc={handleNewDocument}
                onDuplicateEditing={() => {
                  if (editingDoc) handleDuplicateDocument(editingDoc);
                }}
              />
            </div>

            {/* Right Pane: Sticky Live Preview Sheet */}
            <div
              className={`print-only-container xl:col-span-7 xl:sticky xl:top-[76px] pb-24 xl:pb-20 ${
                mobileTab === 'preview' ? 'block' : 'hidden xl:block'
              }`}
            >
              <div className="no-print flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium text-[#8f96a3]">
                  Vista previa · Hoja lista para enviar
                </span>
                <span className="font-mono-num text-xs text-[#a1a7b3]">{previewFolio}</span>
              </div>

              <InvoiceSheet draft={draft} folio={previewFolio} sheetRef={sheetRef} />

              {/* Mobile-only quick one-tap share strip right beneath the sheet */}
              <div className="no-print xl:hidden mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleWhatsApp}
                  className="col-span-2 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] active:scale-[0.99] text-[#0c1a11] text-sm font-bold px-4 transition-transform cursor-pointer disabled:opacity-60"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleExportPng}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b1d22] border border-[#343944] text-white text-xs font-semibold px-3 cursor-pointer disabled:opacity-60"
                >
                  <ImageDown className="w-4 h-4 text-[#bb86fc]" aria-hidden="true" />
                  <span>{exporting === 'png' ? 'Generando...' : 'Imagen PNG'}</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleExportPdf}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b1d22] border border-[#343944] text-white text-xs font-semibold px-3 cursor-pointer disabled:opacity-60"
                >
                  <FileDown className="w-4 h-4 text-[#64b5f6]" aria-hidden="true" />
                  <span>{exporting === 'pdf' ? 'Generando...' : 'Descargar PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Sticky Bottom Action Bar (xl and up) */}
          <div className="no-print hidden xl:block fixed bottom-0 left-[280px] right-0 z-20 bg-[#1b1d22]/95 backdrop-blur-md border-t border-[#2a2e37] px-6 py-2.5">
            <div className="max-w-[1472px] mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => saveCurrentDocument(false)}
                className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-sm px-4 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                  editingDoc
                    ? 'bg-[#bb86fc] hover:bg-[#caa0ff] text-[#121212]'
                    : 'bg-[#1e88e5] hover:bg-[#1976d2] text-white'
                }`}
              >
                <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {saving
                    ? 'Guardando...'
                    : editingDoc
                      ? 'Guardar cambios'
                      : 'Guardar documento'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleExportPdf}
                  aria-label="Descargar PDF"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#23262d] hover:bg-[#2f333d] border border-[#343944] text-[#f4f4f6] text-xs font-semibold px-3.5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <FileDown className="w-4 h-4 text-[#64b5f6]" aria-hidden="true" />
                  <span>{exporting === 'pdf' ? 'Generando...' : 'PDF'}</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleExportPng}
                  aria-label="Descargar Imagen PNG"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#23262d] hover:bg-[#2f333d] border border-[#343944] text-[#f4f4f6] text-xs font-semibold px-3.5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <ImageDown className="w-4 h-4 text-[#bb86fc]" aria-hidden="true" />
                  <span>{exporting === 'png' ? 'Generando...' : 'Imagen'}</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleWhatsApp}
                  aria-label="Enviar por WhatsApp"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] hover:bg-[#20bd5a] text-[#0c1a11] text-xs font-bold px-3.5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handlePrint}
                  aria-label="Imprimir documento"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#23262d] hover:bg-[#2f333d] border border-[#343944] text-[#f4f4f6] text-xs font-semibold px-3.5 py-2.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <Printer className="w-4 h-4 text-[#c5cad3]" aria-hidden="true" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Thumb-Zone Bottom Bar (62px height, 5 large 44px+ hitboxes) */}
          <nav
            aria-label="Navegación rápida móvil"
            className="no-print xl:hidden fixed bottom-0 left-0 lg:left-[280px] right-0 z-30 h-[62px] bg-[#1b1d22]/95 backdrop-blur-md border-t border-[#2a2e37] px-1.5 grid grid-cols-5 items-center"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'editor'}
              onClick={() => setMobileTab('editor')}
              className={`min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                mobileTab === 'editor' ? 'text-[#64b5f6]' : 'text-[#8f96a3] hover:text-white'
              }`}
            >
              <PenSquare className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Editor</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'preview'}
              onClick={() => setMobileTab('preview')}
              className={`min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                mobileTab === 'preview' ? 'text-[#64b5f6]' : 'text-[#8f96a3] hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Vista</span>
            </button>

            <button
              type="button"
              onClick={() => setHistoryDrawerOpen(true)}
              aria-label="Abrir historial de documentos"
              className="lg:hidden min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl text-[#8f96a3] hover:text-white transition-colors cursor-pointer"
            >
              <History className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Historial</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => saveCurrentDocument(false)}
              aria-label={editingDoc ? 'Guardar cambios' : 'Guardar documento'}
              className={`lg:col-span-2 min-h-[46px] mx-1 flex flex-col items-center justify-center gap-0.5 rounded-xl font-semibold transition-transform active:scale-95 cursor-pointer disabled:opacity-60 ${
                editingDoc
                  ? 'bg-[#bb86fc] text-[#121212]'
                  : 'bg-[#1e88e5] text-white'
              }`}
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span className="text-[10px] font-bold leading-none">
                {saving ? '...' : 'Guardar'}
              </span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setExportSheetOpen(true)}
              aria-label="Abrir opciones de envío y exportación"
              className="min-h-[52px] flex flex-col items-center justify-center gap-1 rounded-xl text-[#25d366] hover:text-[#4ade80] transition-colors cursor-pointer disabled:opacity-60"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold leading-none">Enviar</span>
            </button>
          </nav>
        </main>
      </div>

      {/* Modals & Bottom Sheets */}
      <MobileExportSheet
        open={exportSheetOpen}
        folio={previewFolio}
        clientName={draft.clientName}
        grandTotal={liveTotals.grandTotal}
        isEditing={Boolean(editingDoc)}
        busy={isBusy}
        onClose={() => setExportSheetOpen(false)}
        onSave={() => saveCurrentDocument(false)}
        onWhatsApp={handleWhatsApp}
        onPng={handleExportPng}
        onPdf={handleExportPdf}
        onPrint={handlePrint}
        onDuplicate={editingDoc ? () => handleDuplicateDocument(editingDoc) : undefined}
      />

      <UsersModal
        open={usersModalOpen}
        currentUser={user}
        onClose={() => setUsersModalOpen(false)}
        onNotify={notify}
      />

      <WhatsAppModal
        open={whatsAppModal.open}
        message={whatsAppModal.message}
        clientInfo={draft.clientInfo}
        folio={whatsAppModal.folio}
        onClose={() => setWhatsAppModal((prev) => ({ ...prev, open: false }))}
        onCopied={() => notify('Resumen copiado al portapapeles.', 'success')}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
