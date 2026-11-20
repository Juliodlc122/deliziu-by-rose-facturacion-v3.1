import type { DocumentDraft, SavedDocument } from '../types';

export interface PersistedWorkspaceState {
  version: 1;
  draft: DocumentDraft;
  editingDocId: string | null;
  editingDocSnapshot: SavedDocument | null;
  dirty: boolean;
  mobileTab: 'editor' | 'preview';
  savedAt: string;
}

const STORAGE_PREFIX = 'deliziubyrose_workspace_v1_';

export function getWorkspaceStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function isValidDraftShape(value: unknown): value is DocumentDraft {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    (obj.type === 'cotizacion' || obj.type === 'factura') &&
    (obj.billingMode === 'por_articulo' || obj.billingMode === 'por_persona') &&
    Array.isArray(obj.items)
  );
}

export function serializeWorkspaceState(state: PersistedWorkspaceState): string {
  return JSON.stringify(state);
}

export function deserializeWorkspaceState(raw: string | null): PersistedWorkspaceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>;
    if (parsed.version !== 1 || !isValidDraftShape(parsed.draft)) {
      return null;
    }
    return {
      version: 1,
      draft: parsed.draft,
      editingDocId: typeof parsed.editingDocId === 'string' ? parsed.editingDocId : null,
      editingDocSnapshot:
        parsed.editingDocSnapshot && typeof parsed.editingDocSnapshot === 'object'
          ? parsed.editingDocSnapshot
          : null,
      dirty: Boolean(parsed.dirty),
      mobileTab: parsed.mobileTab === 'preview' ? 'preview' : 'editor',
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadWorkspaceState(userId: string): PersistedWorkspaceState | null {
  try {
    const raw = localStorage.getItem(getWorkspaceStorageKey(userId));
    return deserializeWorkspaceState(raw);
  } catch {
    return null;
  }
}

export function saveWorkspaceState(userId: string, state: PersistedWorkspaceState): void {
  try {
    localStorage.setItem(getWorkspaceStorageKey(userId), serializeWorkspaceState(state));
  } catch {
    // Ignore storage quota errors in restricted browsing modes
  }
}

export function clearWorkspaceState(userId: string): void {
  try {
    localStorage.removeItem(getWorkspaceStorageKey(userId));
  } catch {
    // Ignore storage errors
  }
}
