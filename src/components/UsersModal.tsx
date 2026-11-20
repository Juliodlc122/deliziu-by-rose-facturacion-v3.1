import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Shield, Trash2, UserPlus, X } from 'lucide-react';
import type { AuthUser, UserRole } from '../types';
import { api } from '../utils/api';

interface UsersModalProps {
  open: boolean;
  currentUser: AuthUser;
  onClose: () => void;
  onNotify: (message: string, tone: 'success' | 'error' | 'info') => void;
}

export function UsersModal({ open, currentUser, onClose, onNotify }: UsersModalProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDeleteId(null);
    setLoading(true);
    api
      .listUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando usuarios.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createUser({
        username: username.trim(),
        name: name.trim() || username.trim(),
        password,
        role,
      });
      setUsers((prev) => [...prev, res.user]);
      setUsername('');
      setName('');
      setPassword('');
      setRole('employee');
      onNotify(`Usuario ${res.user.username} creado correctamente.`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(target: AuthUser) {
    setError(null);
    try {
      await api.deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setConfirmDeleteId(null);
      onNotify(`Usuario ${target.username} eliminado.`, 'info');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.');
    }
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="users-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl bg-[#1b1d22] border border-[#2e323c] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#2a2e37] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#bb86fc]" aria-hidden="true" />
            <h2 id="users-modal-title" className="text-base font-semibold text-white">
              Gestión de usuarios
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar gestión de usuarios"
            className="p-1.5 rounded-lg text-[#8f96a3] hover:text-white hover:bg-[#23262d] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#cf6679]/12 border border-[#cf6679]/40 px-3.5 py-2.5 text-xs text-[#f3a8b5]"
            >
              {error}
            </div>
          )}

          {/* Create User Form */}
          <form onSubmit={handleCreate} className="space-y-3.5 pb-6 border-b border-[#2a2e37]">
            <h3 className="text-xs font-semibold text-[#c5cad3]">Crear nuevo acceso</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-user-username" className="block text-xs text-[#a1a7b3] mb-1">
                  Usuario
                </label>
                <input
                  id="new-user-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. ana.ventas"
                  className="w-full rounded-lg bg-[#23262d] border border-[#343944] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
                />
              </div>
              <div>
                <label htmlFor="new-user-name" className="block text-xs text-[#a1a7b3] mb-1">
                  Nombre visible
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana Gómez"
                  className="w-full rounded-lg bg-[#23262d] border border-[#343944] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
                />
              </div>
              <div>
                <label htmlFor="new-user-password" className="block text-xs text-[#a1a7b3] mb-1">
                  Contraseña
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full rounded-lg bg-[#23262d] border border-[#343944] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-[#1e88e5]"
                />
              </div>
              <div>
                <label htmlFor="new-user-role" className="block text-xs text-[#a1a7b3] mb-1">
                  Rol
                </label>
                <select
                  id="new-user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg bg-[#23262d] border border-[#343944] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1e88e5]"
                >
                  <option value="employee">Empleado (crear, editar y exportar)</option>
                  <option value="admin">Administrador (control total)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e88e5] hover:bg-[#1976d2] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{submitting ? 'Creando...' : 'Agregar usuario'}</span>
            </button>
          </form>

          {/* Existing Users List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-[#c5cad3]">
              Usuarios registrados ({users.length})
            </h3>
            {loading ? (
              <p className="text-xs text-[#8f96a3] py-4">Cargando usuarios...</p>
            ) : (
              <div className="divide-y divide-[#2a2e37] border border-[#2a2e37] rounded-lg bg-[#23262d]/60">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  const confirming = confirmDeleteId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {u.name}{' '}
                          <span className="text-xs font-mono-num text-[#8f96a3]">
                            @{u.username}
                          </span>
                        </p>
                        <p className="text-xs text-[#a1a7b3] mt-0.5">
                          {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                          {isSelf ? ' · Tu sesión actual' : ''}
                        </p>
                      </div>

                      {!isSelf && (
                        <div className="shrink-0">
                          {confirming ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDelete(u)}
                                className="text-xs font-semibold bg-[#cf6679] text-[#121212] px-2.5 py-1 rounded cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-[#a1a7b3] hover:text-white px-2 py-1 cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(u.id)}
                              aria-label={`Eliminar usuario ${u.username}`}
                              className="p-2 rounded-lg text-[#8f96a3] hover:text-[#cf6679] hover:bg-[#cf6679]/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
