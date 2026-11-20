import type { AuthUser, DocumentDraft, SavedDocument, UserRole } from '../types';

const TOKEN_STORAGE_KEY = 'deliziu_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMessage =
      typeof data?.error === 'string' ? data.error : `Error del servidor (${response.status})`;
    const error = new Error(errMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export interface NextFolios {
  cotizacion: string;
  factura: string;
}

export const api = {
  login(username: string, password: string) {
    return apiRequest<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  me() {
    return apiRequest<{ user: AuthUser }>('/api/auth/me');
  },

  listUsers() {
    return apiRequest<{ users: AuthUser[] }>('/api/users');
  },

  createUser(payload: { username: string; name: string; password: string; role: UserRole }) {
    return apiRequest<{ user: AuthUser }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id: string) {
    return apiRequest<{ deleted: boolean; id: string }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listDocuments() {
    return apiRequest<{ documents: SavedDocument[]; nextFolios: NextFolios }>('/api/documents');
  },

  createDocument(draft: DocumentDraft) {
    return apiRequest<{ document: SavedDocument; nextFolios: NextFolios }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify(draft),
    });
  },

  updateDocument(id: string, draft: DocumentDraft) {
    return apiRequest<{ document: SavedDocument; nextFolios: NextFolios }>(
      `/api/documents/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(draft),
      },
    );
  },

  duplicateDocument(id: string) {
    return apiRequest<{ document: SavedDocument; nextFolios: NextFolios }>(
      `/api/documents/${encodeURIComponent(id)}/duplicate`,
      {
        method: 'POST',
      },
    );
  },

  deleteDocument(id: string) {
    return apiRequest<{ deleted: boolean; id: string }>(
      `/api/documents/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
  },
};
