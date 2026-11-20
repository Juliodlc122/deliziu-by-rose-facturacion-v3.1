import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

type UserRole = 'admin' | 'employee';
type DocumentType = 'cotizacion' | 'factura';
type DocumentStatus = 'borrador' | 'enviada' | 'pagada';
type BillingMode = 'por_articulo' | 'por_persona';
type PackagePricingMode = 'individual' | 'general';
type ItemPricingMode = 'unit' | 'per_person' | 'general';

interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

interface LineItem {
  id: string;
  description: string;
  pricingMode: ItemPricingMode;
  quantity: string;
  price: number;
}

interface SavedDocument {
  id: string;
  folio: string;
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface DocumentsStore {
  counters: {
    cotizacion: number;
    factura: number;
  };
  documents: SavedDocument[];
}

interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DOCS_FILE = path.join(DATA_DIR, 'documents.json');
const SECRET_FILE = path.join(DATA_DIR, '.auth_secret');
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  ensureDataDir();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim();
  }
  ensureDataDir();
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 16) return existing;
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
  return generated;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function signToken(payload: { sub: string; username: string; role: UserRole; exp: number }): string {
  const secret = getAuthSecret();
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): { sub: string; username: string; role: UserRole; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const secret = getAuthSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub: string;
      username: string;
      role: UserRole;
      exp: number;
    };
    if (!parsed.sub || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toPublicUser(u: StoredUser): PublicUser {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  };
}

function loadUsers(): StoredUser[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    const initialPassword = process.env.ADMIN_PASSWORD || 'Deliziu2026';
    const seedUsers: StoredUser[] = [
      {
        id: 'usr-admin-deliziu',
        username: 'Deliziubyrose',
        name: 'Rose (Administradora)',
        role: 'admin',
        passwordHash: hashPassword(initialPassword),
        createdAt: new Date().toISOString(),
      },
    ];
    writeJsonAtomic(USERS_FILE, seedUsers);
    return seedUsers;
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as StoredUser[];
    }
  } catch {
    // Fallback re-seed if file was corrupted
  }
  const initialPassword = process.env.ADMIN_PASSWORD || 'Deliziu2026';
  const fallback: StoredUser[] = [
    {
      id: 'usr-admin-deliziu',
      username: 'Deliziubyrose',
      name: 'Rose (Administradora)',
      role: 'admin',
      passwordHash: hashPassword(initialPassword),
      createdAt: new Date().toISOString(),
    },
  ];
  writeJsonAtomic(USERS_FILE, fallback);
  return fallback;
}

function saveUsers(users: StoredUser[]): void {
  writeJsonAtomic(USERS_FILE, users);
}

function buildSeedDocuments(): DocumentsStore {
  const now = new Date().toISOString();
  const defaultNotes =
    '• Reserva con un 50% de adelanto para confirmar el pedido.\n• No incluye gastos de envío / transporte.';
  const docs: SavedDocument[] = [
    {
      id: 'doc-seed-cot-1',
      folio: 'COT-0001',
      type: 'cotizacion',
      status: 'enviada',
      billingMode: 'por_persona',
      clientName: 'Laura Mercedes Santos',
      clientInfo: '809-555-2418 · Cena familiar de aniversario',
      issueDate: '2026-11-19',
      deliveryDate: '2026-12-05',
      guestCount: 30,
      pricePerPerson: 950,
      items: [
        {
          id: 'it-1',
          description: 'Moro de guandules con coco',
          pricingMode: 'unit',
          quantity: '30',
          price: 0,
        },
        {
          id: 'it-2',
          description: 'Pechuga a la crema de champiñones',
          pricingMode: 'unit',
          quantity: '30',
          price: 0,
        },
        {
          id: 'it-3',
          description: 'Ensalada verde con vinagreta de chinola',
          pricingMode: 'unit',
          quantity: '30',
          price: 0,
        },
        {
          id: 'it-4',
          description: 'Arroz con maíz (extra)',
          pricingMode: 'general',
          quantity: '20',
          price: 2000,
        },
      ],
      deposit: 0,
      notes: defaultNotes,
      createdAt: now,
      updatedAt: now,
      createdBy: 'Deliziubyrose',
      updatedBy: 'Deliziubyrose',
    },
    {
      id: 'doc-seed-fac-1',
      folio: 'FAC-0001',
      type: 'factura',
      status: 'pagada',
      billingMode: 'por_articulo',
      clientName: 'Corporación Caribe Events',
      clientInfo: '829-555-8834 · Brindis corporativo',
      issueDate: '2026-11-18',
      deliveryDate: '2026-11-22',
      guestCount: 20,
      pricePerPerson: 850,
      items: [
        {
          id: 'it-5',
          description: 'Croquetas artesanales de pollo',
          pricingMode: 'unit',
          quantity: '50',
          price: 30,
        },
        {
          id: 'it-6',
          description: 'Kipes rellenos de res',
          pricingMode: 'unit',
          quantity: '40',
          price: 35,
        },
        {
          id: 'it-7',
          description: 'Ensalada rusa de la casa',
          pricingMode: 'general',
          quantity: '2 bandejas',
          price: 2400,
        },
      ],
      deposit: 2650,
      notes: defaultNotes,
      createdAt: now,
      updatedAt: now,
      createdBy: 'Deliziubyrose',
      updatedBy: 'Deliziubyrose',
    },
  ];
  return {
    counters: { cotizacion: 1, factura: 1 },
    documents: docs,
  };
}

function loadDocumentsStore(): DocumentsStore {
  ensureDataDir();
  if (!fs.existsSync(DOCS_FILE)) {
    const seed = buildSeedDocuments();
    writeJsonAtomic(DOCS_FILE, seed);
    return seed;
  }
  try {
    const raw = fs.readFileSync(DOCS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const docs = parsed as SavedDocument[];
      return {
        counters: computeCountersFromDocs(docs),
        documents: docs,
      };
    }
    if (parsed && Array.isArray(parsed.documents)) {
      const docs = parsed.documents as SavedDocument[];
      const computed = computeCountersFromDocs(docs);
      return {
        counters: {
          cotizacion: Math.max(Number(parsed.counters?.cotizacion) || 0, computed.cotizacion),
          factura: Math.max(Number(parsed.counters?.factura) || 0, computed.factura),
        },
        documents: docs,
      };
    }
  } catch {
    // Re-initialize on corrupt JSON
  }
  const seed = buildSeedDocuments();
  writeJsonAtomic(DOCS_FILE, seed);
  return seed;
}

function computeCountersFromDocs(docs: SavedDocument[]): { cotizacion: number; factura: number } {
  let maxCot = 0;
  let maxFac = 0;
  for (const d of docs) {
    const match = /^(COT|FAC)-(\d+)$/i.exec(d.folio || '');
    if (!match) continue;
    const num = Number(match[2]);
    if (match[1].toUpperCase() === 'COT') maxCot = Math.max(maxCot, num);
    if (match[1].toUpperCase() === 'FAC') maxFac = Math.max(maxFac, num);
  }
  return { cotizacion: maxCot, factura: maxFac };
}

function saveDocumentsStore(store: DocumentsStore): void {
  writeJsonAtomic(DOCS_FILE, store);
}

function nextFolio(store: DocumentsStore, type: DocumentType): string {
  if (type === 'factura') {
    store.counters.factura += 1;
    return `FAC-${String(store.counters.factura).padStart(4, '0')}`;
  }
  store.counters.cotizacion += 1;
  return `COT-${String(store.counters.cotizacion).padStart(4, '0')}`;
}

function sanitizeItems(rawItems: unknown): LineItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((item, idx) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const pricingMode: ItemPricingMode =
      obj.pricingMode === 'general'
        ? 'general'
        : obj.pricingMode === 'per_person'
          ? 'per_person'
          : 'unit';
    const rawPrice = Number(obj.price);
    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? Math.round(rawPrice * 100) / 100 : 0;
    return {
      id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `item-${Date.now()}-${idx}`,
      description: typeof obj.description === 'string' ? obj.description : '',
      pricingMode,
      quantity: obj.quantity !== undefined && obj.quantity !== null ? String(obj.quantity) : '',
      price,
    };
  });
}

function sanitizeDocumentPayload(body: Record<string, unknown>) {
  const type: DocumentType = body.type === 'factura' ? 'factura' : 'cotizacion';
  const status: DocumentStatus =
    body.status === 'enviada' || body.status === 'pagada' ? body.status : 'borrador';
  const billingMode: BillingMode =
    body.billingMode === 'por_persona' ? 'por_persona' : 'por_articulo';
  const packagePricingMode: PackagePricingMode =
    body.packagePricingMode === 'general' ? 'general' : 'individual';
  const guestCount = Math.max(0, Math.floor(Number(body.guestCount) || 0));
  const rawPpp = Number(body.pricePerPerson);
  const pricePerPerson = Number.isFinite(rawPpp) && rawPpp >= 0 ? Math.round(rawPpp * 100) / 100 : 0;
  const rawPkgGeneral = Number(body.packageGeneralPrice);
  const packageGeneralPrice =
    Number.isFinite(rawPkgGeneral) && rawPkgGeneral >= 0
      ? Math.round(rawPkgGeneral * 100) / 100
      : 0;
  const rawDeposit = Number(body.deposit);
  const deposit = Number.isFinite(rawDeposit) && rawDeposit >= 0 ? Math.round(rawDeposit * 100) / 100 : 0;

  return {
    type,
    status,
    billingMode,
    packagePricingMode,
    packageGeneralPrice,
    clientName: typeof body.clientName === 'string' ? body.clientName.trim() : '',
    clientInfo: typeof body.clientInfo === 'string' ? body.clientInfo.trim() : '',
    issueDate: typeof body.issueDate === 'string' ? body.issueDate.trim() : '',
    deliveryDate: typeof body.deliveryDate === 'string' ? body.deliveryDate.trim() : '',
    guestCount,
    pricePerPerson,
    items: sanitizeItems(body.items),
    deposit,
    notes: typeof body.notes === 'string' ? body.notes : '',
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sesión no iniciada. Por favor inicia sesión.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Tu sesión expiró o es inválida. Inicia sesión nuevamente.' });
    return;
  }
  const users = loadUsers();
  const user = users.find((u) => u.id === payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }
  req.user = toPublicUser(user);
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo el Administrador puede realizar esta acción.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  // Initialize storage upfront
  loadUsers();
  loadDocumentsStore();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health check for Render.com
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Auth routes
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    const cleanUser = (username || '').trim();
    const cleanPass = password || '';

    if (!cleanUser || !cleanPass) {
      res.status(400).json({ error: 'Ingresa tu usuario y contraseña.' });
      return;
    }

    const users = loadUsers();
    const found = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
    if (!found || !verifyPassword(cleanPass, found.passwordHash)) {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      return;
    }

    const token = signToken({
      sub: found.id,
      username: found.username,
      role: found.role,
      exp: Date.now() + TOKEN_TTL_MS,
    });

    res.json({
      token,
      user: toPublicUser(found),
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // User management routes (Admin only)
  app.get('/api/users', requireAuth, requireAdmin, (_req, res) => {
    const users = loadUsers().map(toPublicUser);
    res.json({ users });
  });

  app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
    const { username, name, password, role } = (req.body || {}) as {
      username?: string;
      name?: string;
      password?: string;
      role?: string;
    };
    const cleanUsername = (username || '').trim();
    const cleanName = (name || '').trim() || cleanUsername;
    const cleanPassword = password || '';
    const cleanRole: UserRole = role === 'admin' ? 'admin' : 'employee';

    if (cleanUsername.length < 3) {
      res.status(400).json({ error: 'El usuario debe tener al menos 3 caracteres.' });
      return;
    }
    if (/\s/.test(cleanUsername)) {
      res.status(400).json({ error: 'El nombre de usuario no puede contener espacios.' });
      return;
    }
    if (cleanPassword.length < 4) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    const users = loadUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      res.status(409).json({ error: 'Ya existe un usuario con ese nombre.' });
      return;
    }

    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID()}`,
      username: cleanUsername,
      name: cleanName,
      role: cleanRole,
      passwordHash: hashPassword(cleanPassword),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);
    res.status(201).json({ user: toPublicUser(newUser) });
  });

  app.delete('/api/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const targetId = req.params.id;
    if (req.user && req.user.id === targetId) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta activa.' });
      return;
    }
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    const target = users[idx];
    if (target.role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Debe existir al menos una cuenta de Administrador.' });
        return;
      }
    }
    users.splice(idx, 1);
    saveUsers(users);
    res.json({ deleted: true, id: targetId });
  });

  // Document routes
  app.get('/api/documents', requireAuth, (_req, res) => {
    const store = loadDocumentsStore();
    const sorted = [...store.documents].sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    );
    res.json({
      documents: sorted,
      nextFolios: {
        cotizacion: `COT-${String(store.counters.cotizacion + 1).padStart(4, '0')}`,
        factura: `FAC-${String(store.counters.factura + 1).padStart(4, '0')}`,
      },
    });
  });

  app.get('/api/documents/:id', requireAuth, (req, res) => {
    const store = loadDocumentsStore();
    const doc = store.documents.find((d) => d.id === req.params.id);
    if (!doc) {
      res.status(404).json({ error: 'Documento no encontrado.' });
      return;
    }
    res.json({ document: doc });
  });

  app.post('/api/documents', requireAuth, (req: AuthenticatedRequest, res) => {
    const payload = sanitizeDocumentPayload((req.body || {}) as Record<string, unknown>);
    const store = loadDocumentsStore();
    const now = new Date().toISOString();
    const folio = nextFolio(store, payload.type);

    const newDoc: SavedDocument = {
      id: `doc-${crypto.randomUUID()}`,
      folio,
      ...payload,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.username || 'sistema',
      updatedBy: req.user?.username || 'sistema',
    };

    store.documents.unshift(newDoc);
    saveDocumentsStore(store);

    res.status(201).json({
      document: newDoc,
      nextFolios: {
        cotizacion: `COT-${String(store.counters.cotizacion + 1).padStart(4, '0')}`,
        factura: `FAC-${String(store.counters.factura + 1).padStart(4, '0')}`,
      },
    });
  });

  app.put('/api/documents/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const payload = sanitizeDocumentPayload((req.body || {}) as Record<string, unknown>);
    const store = loadDocumentsStore();
    const idx = store.documents.findIndex((d) => d.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Documento no encontrado.' });
      return;
    }

    const existing = store.documents[idx];
    let folio = existing.folio;
    if (existing.type !== payload.type) {
      folio = nextFolio(store, payload.type);
    }

    const updated: SavedDocument = {
      ...existing,
      ...payload,
      folio,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user?.username || existing.updatedBy,
    };

    store.documents[idx] = updated;
    saveDocumentsStore(store);

    res.json({
      document: updated,
      nextFolios: {
        cotizacion: `COT-${String(store.counters.cotizacion + 1).padStart(4, '0')}`,
        factura: `FAC-${String(store.counters.factura + 1).padStart(4, '0')}`,
      },
    });
  });

  app.post('/api/documents/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res) => {
    const store = loadDocumentsStore();
    const source = store.documents.find((d) => d.id === req.params.id);
    if (!source) {
      res.status(404).json({ error: 'Documento origen no encontrado.' });
      return;
    }

    const now = new Date().toISOString();
    const folio = nextFolio(store, source.type);
    const cloned: SavedDocument = {
      ...source,
      id: `doc-${crypto.randomUUID()}`,
      folio,
      status: 'borrador',
      items: source.items.map((it, idx) => ({
        ...it,
        id: `item-${Date.now()}-${idx}`,
      })),
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.username || 'sistema',
      updatedBy: req.user?.username || 'sistema',
    };

    store.documents.unshift(cloned);
    saveDocumentsStore(store);

    res.status(201).json({
      document: cloned,
      nextFolios: {
        cotizacion: `COT-${String(store.counters.cotizacion + 1).padStart(4, '0')}`,
        factura: `FAC-${String(store.counters.factura + 1).padStart(4, '0')}`,
      },
    });
  });

  app.delete('/api/documents/:id', requireAuth, requireAdmin, (req, res) => {
    const store = loadDocumentsStore();
    const idx = store.documents.findIndex((d) => d.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Documento no encontrado.' });
      return;
    }
    store.documents.splice(idx, 1);
    saveDocumentsStore(store);
    res.json({ deleted: true, id: req.params.id });
  });

  // Static / Vite Frontend Serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const publicDir = path.resolve(process.cwd(), 'public');
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deliziu by Rose server listening on http://0.0.0.0:${PORT} (DATA_DIR=${DATA_DIR})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
