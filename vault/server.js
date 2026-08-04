// ===========================================================================
//  VAULT — Stockage et partage de fichiers securise (Cloudflare R2)
// ===========================================================================
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');
const r2 = require('./r2');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
app.set('trust proxy', 1); // un seul niveau de proxy de confiance (celui de Railway) : empeche de falsifier son IP
app.use(helmet({
  contentSecurityPolicy: false // desactive pour l'instant : evite de casser les styles/scripts en ligne existants
}));

// Limite les tentatives de connexion/inscription (protection contre le bourrage d'identifiants)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
  standardHeaders: true, legacyHeaders: false
});
// Limite plus large mais reelle sur l'ensemble de l'API (protection generale contre les abus)
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const PORT = process.env.PORT || 3000;
const SITE_NAME = process.env.SITE_NAME || 'Vault';
const DATA_DIR = process.env.DATA_DIR || __dirname;

function clientIp(req) {
  return (req.headers['cf-connecting-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip || '').replace('::ffff:', '').slice(0, 45);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/api/', apiLimiter);
// Le manifeste et le service worker DOIVENT etre servis a la racine (pas sous /static)
// pour que la portee de la PWA couvre bien tout le site, pas juste /static/*.
app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manifest.json')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sw.js')));

// --- Sessions (stockees en SQLite, persistantes apres redemarrage) ---
// IMPORTANT : l'option "db" de connect-sqlite3 attend une connexion DEJA OUVERTE
// (pas un nom de fichier) — voir le correctif applique sur le projet BioLink.
const sessionDb = new sqlite3.Database(path.join(DATA_DIR, 'sessions.db'));
app.use(session({
  store: new SQLiteStore({ db: sessionDb }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }
}));

app.use((req, res, next) => {
  res.locals.me = req.session.userId
    ? db.prepare('SELECT id, username, storage_used, storage_quota FROM users WHERE id = ?').get(req.session.userId)
    : null;
  res.locals.siteName = SITE_NAME;
  next();
});

// ===========================================================================
//  HELPERS
// ===========================================================================
const RESERVED = new Set(['login', 'register', 'logout', 'static', 'api', 's', 'app', 'account', 'trash', 'shared', 'recent', 'admin', 'favicon.ico']);

function validUsername(u) {
  return typeof u === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(u) && !RESERVED.has(u.toLowerCase());
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth' });
    return res.redirect('/login');
  }
  // Session presente mais utilisateur introuvable en base (ex: base reinitialisee, session obsolete)
  // -> on nettoie la session au lieu de planter plus loin dans le code.
  if (!res.locals.me) {
    req.session.destroy(() => {});
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'auth' });
    return res.redirect('/login');
  }
  next();
}
function fmtBytes(n) {
  if (n < 1024) return n + ' o';
  const units = ['Ko', 'Mo', 'Go', 'To'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < units.length - 1);
  return n.toFixed(n < 10 ? 2 : 1) + ' ' + units[i];
}
// Verifie qu'un dossier appartient bien a l'utilisateur (empeche d'acceder aux dossiers d'autrui par id)
function ownFolder(userId, folderId) {
  if (!folderId) return true;
  const f = db.prepare('SELECT 1 FROM folders WHERE id = ? AND user_id = ? AND trashed_at = 0').get(folderId, userId);
  return !!f;
}

// ===========================================================================
//  AUTHENTIFICATION
// ===========================================================================
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('register', { error: null, username: '' });
});
app.post('/register', authLimiter, (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const render = (error) => res.status(400).render('register', { error, username });

  if (!validUsername(username)) return render('Pseudo invalide (3 à 20 caractères : lettres, chiffres, _).');
  if (password.length < 8) return render('Le mot de passe doit faire au moins 8 caractères.');
  const exists = db.prepare('SELECT 1 FROM users WHERE username_lower = ?').get(username.toLowerCase());
  if (exists) return render('Ce pseudo est déjà pris.');

  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare('INSERT INTO users (username, username_lower, password, created_at) VALUES (?,?,?,?)')
    .run(username, username.toLowerCase(), hash, Date.now());
  req.session.userId = info.lastInsertRowid;
  res.redirect('/');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { error: null, username: '' });
});
app.post('/login', authLimiter, (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const user = db.prepare('SELECT * FROM users WHERE username_lower = ?').get(username.toLowerCase());
  // Meme message d'erreur, que le pseudo existe ou non (n'aide pas a deviner les comptes existants)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).render('login', { error: 'Pseudo ou mot de passe incorrect.', username });
  }
  req.session.userId = user.id;
  res.redirect('/');
});
app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// ===========================================================================
//  DOSSIERS ET FICHIERS — navigation
// ===========================================================================
// Recupere le contenu d'un dossier (ou de la racine si folderId est null),
// en verifiant systematiquement que tout appartient bien a l'utilisateur.
function listFolder(userId, folderId) {
  const folders = db.prepare(
    'SELECT id, name, created_at FROM folders WHERE user_id = ? AND parent_id IS ? AND trashed_at = 0 ORDER BY name COLLATE NOCASE'
  ).all(userId, folderId);
  const files = db.prepare(
    'SELECT id, name, mime, size, created_at FROM files WHERE user_id = ? AND folder_id IS ? AND trashed_at = 0 ORDER BY name COLLATE NOCASE'
  ).all(userId, folderId);
  return { folders, files };
}
// Reconstruit le fil d'Ariane (racine -> ... -> dossier courant)
function breadcrumbOf(folderId) {
  const chain = [];
  let cur = folderId;
  while (cur) {
    const f = db.prepare('SELECT id, name, parent_id FROM folders WHERE id = ?').get(cur);
    if (!f) break;
    chain.unshift({ id: f.id, name: f.name });
    cur = f.parent_id;
  }
  return chain;
}

app.get('/', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { folders, files } = listFolder(u.id, null);
  res.render('vault', { folders, files, currentFolder: null, breadcrumb: [], fmtBytes });
});

app.get('/folder/:id', requireAuth, (req, res) => {
  const u = res.locals.me;
  const folderId = parseInt(req.params.id, 10);
  if (!ownFolder(u.id, folderId)) return res.status(404).render('404');
  const { folders, files } = listFolder(u.id, folderId);
  res.render('vault', { folders, files, currentFolder: folderId, breadcrumb: breadcrumbOf(folderId), fmtBytes });
});

app.post('/api/folders', requireAuth, (req, res) => {
  const u = res.locals.me;
  const name = (req.body.name || '').trim().slice(0, 80);
  const parentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
  if (!name) return res.status(400).json({ error: 'Nom de dossier requis.' });
  if (!ownFolder(u.id, parentId)) return res.status(404).json({ error: 'Dossier parent introuvable.' });
  const info = db.prepare('INSERT INTO folders (user_id, parent_id, name, created_at) VALUES (?,?,?,?)')
    .run(u.id, parentId, name, Date.now());
  res.json({ ok: true, id: info.lastInsertRowid, name });
});

module.exports = { app, PORT, requireAuth, ownFolder, fmtBytes, validUsername, clientIp, RESERVED, SITE_NAME, listFolder };

// ===========================================================================
//  UPLOAD (vers Cloudflare R2, jamais de compression : qualite d'origine)
// ===========================================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 Go par fichier (limite technique, pas la limite de quota)
});

app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  const u = res.locals.me;
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
  const folderId = req.body.folder_id ? parseInt(req.body.folder_id, 10) : null;
  if (!ownFolder(u.id, folderId)) return res.status(404).json({ error: 'Dossier introuvable.' });

  // Verification du quota AVANT tout envoi vers R2 (evite de gaspiller de la bande passante pour rien)
  const fresh = db.prepare('SELECT storage_used, storage_quota FROM users WHERE id = ?').get(u.id);
  if (fresh.storage_used + req.file.size > fresh.storage_quota) {
    return res.status(413).json({ error: 'quota', message: `Stockage plein : il ne te reste que ${fmtBytes(Math.max(0, fresh.storage_quota - fresh.storage_used))}.` });
  }
  if (!r2.R2_CONFIGURED) return res.status(500).json({ error: 'Le stockage R2 n\'est pas configuré sur ce serveur.' });

  try {
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);
    const key = r2.makeR2Key(u.id, originalName);
    await r2.uploadBuffer(key, req.file.buffer, req.file.mimetype);
    const info = db.prepare('INSERT INTO files (user_id, folder_id, name, r2_key, mime, size, created_at) VALUES (?,?,?,?,?,?,?)')
      .run(u.id, folderId, originalName, key, req.file.mimetype || '', req.file.size, Date.now());
    db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(req.file.size, u.id);
    res.json({ ok: true, id: info.lastInsertRowid, name: originalName, size: req.file.size });
  } catch (e) {
    console.error('[upload]', e);
    res.status(500).json({ error: 'Échec de l\'envoi vers le stockage.' });
  }
});

// ===========================================================================
//  TELECHARGEMENT (lien signe genere a la demande, jamais stocke)
// ===========================================================================
app.get('/api/download/:id', requireAuth, async (req, res) => {
  const u = res.locals.me;
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND trashed_at = 0').get(req.params.id, u.id);
  if (!file) return res.status(404).json({ error: 'Fichier introuvable.' });
  try {
    const url = await r2.signedDownloadUrl(file.r2_key, file.name);
    res.redirect(url);
  } catch (e) {
    console.error('[download]', e);
    res.status(500).json({ error: 'Impossible de générer le lien de téléchargement.' });
  }
});

// ===========================================================================
//  RENOMMER / DEPLACER / CORBEILLE
// ===========================================================================
app.post('/api/rename', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const name = (req.body.name || '').trim().slice(0, 120);
  if (!name) return res.status(400).json({ error: 'Nom requis.' });
  const table = type === 'folder' ? 'folders' : 'files';
  const info = db.prepare(`UPDATE ${table} SET name = ? WHERE id = ? AND user_id = ?`).run(name, id, u.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Introuvable.' });
  res.json({ ok: true, name });
});

app.post('/api/move', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const targetFolderId = req.body.target_folder_id ? parseInt(req.body.target_folder_id, 10) : null;
  if (!ownFolder(u.id, targetFolderId)) return res.status(404).json({ error: 'Dossier cible introuvable.' });
  const table = type === 'folder' ? 'folders' : 'files';
  const col = type === 'folder' ? 'parent_id' : 'folder_id';
  if (type === 'folder' && parseInt(id, 10) === targetFolderId) return res.status(400).json({ error: 'Un dossier ne peut pas se déplacer dans lui-même.' });
  const info = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ? AND user_id = ?`).run(targetFolderId, id, u.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Introuvable.' });
  res.json({ ok: true });
});

app.post('/api/trash', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const table = type === 'folder' ? 'folders' : 'files';
  const info = db.prepare(`UPDATE ${table} SET trashed_at = ? WHERE id = ? AND user_id = ?`).run(Date.now(), id, u.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Introuvable.' });
  res.json({ ok: true });
});

app.post('/api/restore', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const table = type === 'folder' ? 'folders' : 'files';
  const info = db.prepare(`UPDATE ${table} SET trashed_at = 0 WHERE id = ? AND user_id = ?`).run(id, u.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Introuvable.' });
  res.json({ ok: true });
});

// Suppression definitive : retire aussi le fichier de R2 et met a jour le quota utilise
app.post('/api/delete-permanent', requireAuth, async (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  if (type === 'folder') {
    db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(id, u.id);
    return res.json({ ok: true });
  }
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(id, u.id);
  if (!file) return res.status(404).json({ error: 'Introuvable.' });
  try { await r2.deleteObject(file.r2_key); } catch (e) { console.error('[delete r2]', e); }
  db.prepare('DELETE FROM files WHERE id = ?').run(id);
  db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(file.size, u.id);
  res.json({ ok: true });
});

// ===========================================================================
//  RECHERCHE
// ===========================================================================
app.get('/api/search', requireAuth, (req, res) => {
  const u = res.locals.me;
  const q = '%' + (req.query.q || '').trim().slice(0, 100) + '%';
  if (q === '%%') return res.json({ folders: [], files: [] });
  const folders = db.prepare('SELECT id, name FROM folders WHERE user_id = ? AND trashed_at = 0 AND name LIKE ? COLLATE NOCASE LIMIT 30').all(u.id, q);
  const files = db.prepare('SELECT id, name, size, mime FROM files WHERE user_id = ? AND trashed_at = 0 AND name LIKE ? COLLATE NOCASE LIMIT 30').all(u.id, q);
  res.json({ folders, files });
});

// ===========================================================================
//  CORBEILLE
// ===========================================================================
app.get('/trash', requireAuth, (req, res) => {
  const u = res.locals.me;
  const folders = db.prepare('SELECT id, name, created_at FROM folders WHERE user_id = ? AND trashed_at > 0 ORDER BY trashed_at DESC').all(u.id);
  const files = db.prepare('SELECT id, name, mime, size, created_at FROM files WHERE user_id = ? AND trashed_at > 0 ORDER BY trashed_at DESC').all(u.id);
  res.render('trash', { folders, files, fmtBytes });
});

// ===========================================================================
//  PARTAGE
// ===========================================================================
app.post('/api/share', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const col = type === 'folder' ? 'folder_id' : 'file_id';
  const table = type === 'folder' ? 'folders' : 'files';
  const owns = db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND user_id = ?`).get(id, u.id);
  if (!owns) return res.status(404).json({ error: 'Introuvable.' });
  // Reutilise un lien existant et actif si deja partage, plutot que d'en creer un nouveau a chaque clic
  const existing = db.prepare(`SELECT token FROM shares WHERE ${col} = ? AND user_id = ? AND revoked_at = 0`).get(id, u.id);
  if (existing) return res.json({ ok: true, token: existing.token });
  const token = crypto.randomBytes(9).toString('base64url');
  db.prepare(`INSERT INTO shares (token, user_id, ${col}, created_at) VALUES (?,?,?,?)`).run(token, u.id, id, Date.now());
  res.json({ ok: true, token });
});

app.post('/api/share/revoke', requireAuth, (req, res) => {
  const u = res.locals.me;
  db.prepare('UPDATE shares SET revoked_at = ? WHERE token = ? AND user_id = ?').run(Date.now(), req.body.token, u.id);
  res.json({ ok: true });
});

// Page publique d'un lien partage (lecture seule, aucun compte requis)
app.get('/s/:token', async (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ? AND revoked_at = 0').get(req.params.token);
  if (!share) return res.status(404).render('404');
  if (share.file_id) {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND trashed_at = 0').get(share.file_id);
    if (!file) return res.status(404).render('404');
    return res.render('share-file', { file, token: req.params.token, fmtBytes });
  }
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND trashed_at = 0').get(share.folder_id);
  if (!folder) return res.status(404).render('404');
  const { folders, files } = listFolder(folder.user_id, folder.id);
  res.render('share-folder', { folder, folders, files, token: req.params.token, rootFolderId: folder.id, fmtBytes });
});

// Telechargement d'un fichier partage publiquement (verifie le lien, pas de session requise)
// Verifie que folderId est bien le dossier partage lui-meme, ou un de ses sous-dossiers
function isWithinSharedFolder(folderId, rootFolderId) {
  let cur = folderId;
  let guard = 0; // securite anti boucle infinie
  while (cur && guard++ < 50) {
    if (cur === rootFolderId) return true;
    const f = db.prepare('SELECT parent_id FROM folders WHERE id = ?').get(cur);
    if (!f) return false;
    cur = f.parent_id;
  }
  return false;
}

app.get('/s/:token/folder/:folderId', async (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ? AND revoked_at = 0').get(req.params.token);
  if (!share || !share.folder_id) return res.status(404).render('404');
  const folderId = parseInt(req.params.folderId, 10);
  if (!isWithinSharedFolder(folderId, share.folder_id)) return res.status(404).render('404');
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND trashed_at = 0').get(folderId);
  if (!folder) return res.status(404).render('404');
  const { folders, files } = listFolder(folder.user_id, folder.id);
  res.render('share-folder', { folder, folders, files, token: req.params.token, rootFolderId: share.folder_id, fmtBytes });
});

app.get('/s/:token/file/:fileId/download', async (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ? AND revoked_at = 0').get(req.params.token);
  if (!share || !share.folder_id) return res.status(404).render('404');
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND trashed_at = 0').get(req.params.fileId);
  if (!file || !isWithinSharedFolder(file.folder_id, share.folder_id)) return res.status(404).render('404');
  try {
    const url = await r2.signedDownloadUrl(file.r2_key, file.name);
    res.redirect(url);
  } catch (e) { res.status(500).render('404'); }
});

app.get('/s/:token/download', async (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ? AND revoked_at = 0').get(req.params.token);
  if (!share || !share.file_id) return res.status(404).render('404');
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND trashed_at = 0').get(share.file_id);
  if (!file) return res.status(404).render('404');
  try {
    const url = await r2.signedDownloadUrl(file.r2_key, file.name);
    res.redirect(url);
  } catch (e) { res.status(500).render('404'); }
});

app.use((req, res) => res.status(404).render('404'));

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Vault en ligne sur http://localhost:${PORT}`));
}
