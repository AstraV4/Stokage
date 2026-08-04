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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1 Go par fichier (limite technique, pas la limite de quota)
});
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo max pour une photo de profil
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});
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
// ---------------------------------------------------------------------------
// Icones SVG (trait fin, style coherent) — remplace tout usage d'emoji dans l'interface
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
  'folder-plus': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M12 11v4M10 13h4"/>',
  share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 8.2a3 3 0 1 1 0 5.9"/><path d="M21 20c0-2.6-1.8-4.8-4.2-5.6"/>',
  'user-plus': '<circle cx="10" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><path d="M19 8v6M16 11h6"/>',
  message: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.3"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m1 0v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7z"/><path d="M10 11v5M14 11v5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  bell: '<path d="M6 10a6 6 0 1 1 12 0c0 3 1 4.5 1.5 5.5H4.5C5 14.5 6 13 6 10z"/><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M19 19l-4.3-4.3"/>',
  upload: '<path d="M12 16V5M8 9l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 3.5 3.5L17 11l3 3"/>',
  video: '<rect x="3.5" y="6" width="13" height="12" rx="2"/><path d="M16.5 10.5l4-2.3v7.6l-4-2.3"/>',
  file: '<path d="M6 3.5h8l4 4V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M14 3.5V8h4"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  edit: '<path d="M4 16.5V20h3.5L18 9.5l-3.5-3.5L4 16.5z"/><path d="M14 6.5l3.5 3.5"/>',
  'log-out': '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M15 16l4-4-4-4"/><path d="M19 12H9"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  palette: '<path d="M12 3a9 8.5 0 1 0 0 17c1.4 0 2-1 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.7-.5-1.2 0-.8.7-1.4 1.5-1.4H16a4 4 0 0 0 4-4c0-4-3.6-7-8-7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="8.5" cy="7" r="1"/><circle cx="13" cy="6.5" r="1"/><circle cx="16.5" cy="9" r="1"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>',
  crown: '<path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 9h-13z"/>',
  paperclip: '<path d="M8 12.5l6-6a3 3 0 1 1 4.2 4.2l-8 8a4.5 4.5 0 1 1-6.4-6.4L11 5"/>'
};
function icon(name, cls) {
  const body = ICON_PATHS[name] || '';
  return `<svg class="ic-svg${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}


// --- E-mail (Resend) : verification d'adresse + reinitialisation de mot de passe ---
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || ('no-reply@' + (process.env.APP_URL || 'example.com').replace(/^https?:\/\//, '').split('/')[0]);
const MAIL_ENABLED = !!RESEND_API_KEY;
function baseUrl(req) {
  return (req.headers['x-forwarded-proto'] || req.protocol || 'https') + '://' + req.get('host');
}
async function sendMail(to, subject, html) {
  if (!MAIL_ENABLED) { console.warn('[mail] RESEND_API_KEY absente, e-mail non envoye a', to); return; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, html })
    });
    if (!r.ok) console.error('[mail] erreur Resend', r.status, await r.text());
  } catch (e) { console.error('[mail] exception', e); }
}
function mailLayout(title, bodyHtml) {
  return '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:30px 20px">' +
    '<h2 style="color:#111">' + title + '</h2>' + bodyHtml +
    '<p style="color:#999;font-size:12px;margin-top:30px">' + SITE_NAME + '</p></div>';
}
function mailButton(url, label) {
  return '<p style="margin:24px 0"><a href="' + url + '" style="background:#3b82f6;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">' + label + '</a></p>' +
    '<p style="color:#999;font-size:12px">Ou copie ce lien : ' + url + '</p>';
}
function newToken() { return crypto.randomBytes(24).toString('hex'); }
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
    ? db.prepare('SELECT id, username, storage_used, storage_quota, theme FROM users WHERE id = ?').get(req.session.userId)
    : null;
  res.locals.siteName = SITE_NAME;
  res.locals.icon = icon;
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
// Recupere un fichier si l'utilisateur en est proprietaire OU si quelqu'un le lui a partage directement.
// Renvoie aussi readOnly=true dans le second cas (jamais de renommage/suppression sur un fichier d'autrui).
function accessibleFile(userId, fileId) {
  const owned = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND trashed_at = 0').get(fileId, userId);
  if (owned) return { file: owned, readOnly: false };
  const shared = db.prepare(`
    SELECT f.* FROM files f
    JOIN shares s ON s.file_id = f.id
    WHERE f.id = ? AND s.shared_with_user_id = ? AND s.revoked_at = 0 AND f.trashed_at = 0
  `).get(fileId, userId);
  return shared ? { file: shared, readOnly: true } : null;
}

// ===========================================================================
//  AUTHENTIFICATION
// ===========================================================================
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('register', { error: null, username: '', email: '' });
});
app.post('/register', authLimiter, async (req, res) => {
  const username = (req.body.username || '').trim();
  const email = (req.body.email || '').trim();
  const emailLower = email.toLowerCase();
  const password = req.body.password || '';
  const render = (error) => res.status(400).render('register', { error, username, email });

  if (!validUsername(username)) return render('Pseudo invalide (3 à 20 caractères : lettres, chiffres, _).');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return render('Adresse e-mail invalide.');
  if (password.length < 8) return render('Le mot de passe doit faire au moins 8 caractères.');
  const exists = db.prepare('SELECT 1 FROM users WHERE username_lower = ?').get(username.toLowerCase());
  if (exists) return render('Ce pseudo est déjà pris.');
  const emailTaken = db.prepare('SELECT 1 FROM users WHERE email_lower = ?').get(emailLower);
  if (emailTaken) return render('Cette adresse e-mail est déjà utilisée.');

  const hash = bcrypt.hashSync(password, 12);
  const verifyToken = MAIL_ENABLED ? newToken() : '';
  const info = db.prepare('INSERT INTO users (username, username_lower, email, email_lower, password, created_at, email_verified, verify_token) VALUES (?,?,?,?,?,?,?,?)')
    .run(username, username.toLowerCase(), email, emailLower, hash, Date.now(), MAIL_ENABLED ? 0 : 1, verifyToken);

  if (MAIL_ENABLED) {
    const link = baseUrl(req) + '/verify?token=' + verifyToken;
    await sendMail(email, 'Confirme ton adresse e-mail',
      mailLayout('Bienvenue \u{1F44B}', '<p style="color:#3c4149;font-size:14px;line-height:1.6">Merci de t\'être inscrit sur ' + SITE_NAME + ' ! Clique sur le bouton pour activer ton compte et accéder à tes 15 Go de stockage.</p>' + mailButton(link, 'Confirmer mon adresse')));
    return res.render('verify-sent', { email, siteName: SITE_NAME });
  }
  req.session.userId = info.lastInsertRowid;
  res.redirect('/');
});

app.get('/verify', (req, res) => {
  const token = (req.query.token || '').toString();
  const user = token ? db.prepare("SELECT * FROM users WHERE verify_token = ? AND verify_token != ''").get(token) : null;
  if (!user) return res.render('verify-result', { ok: false, siteName: SITE_NAME });
  db.prepare("UPDATE users SET email_verified = 1, verify_token = '' WHERE id = ?").run(user.id);
  res.render('verify-result', { ok: true, siteName: SITE_NAME });
});
app.post('/verify/resend', authLimiter, async (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE username_lower = ?').get(username);
  if (user && !user.email_verified && user.email && MAIL_ENABLED) {
    const verifyToken = newToken();
    db.prepare('UPDATE users SET verify_token = ? WHERE id = ?').run(verifyToken, user.id);
    const link = baseUrl(req) + '/verify?token=' + verifyToken;
    await sendMail(user.email, 'Confirme ton adresse e-mail', mailLayout('Bienvenue \u{1F44B}', mailButton(link, 'Confirmer mon adresse')));
  }
  res.render('verify-sent', { email: user ? user.email : '', siteName: SITE_NAME });
});

app.get('/forgot', (req, res) => res.render('forgot', { error: null, done: false, siteName: SITE_NAME }));
app.post('/forgot', authLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const user = email ? db.prepare('SELECT * FROM users WHERE email_lower = ?').get(email) : null;
  if (user && MAIL_ENABLED) {
    const resetToken = newToken();
    const resetExpires = Date.now() + 60 * 60 * 1000;
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(resetToken, resetExpires, user.id);
    const link = baseUrl(req) + '/reset?token=' + resetToken;
    await sendMail(user.email, 'Réinitialise ton mot de passe',
      mailLayout('Mot de passe oublié ?', '<p style="color:#3c4149;font-size:14px;line-height:1.6">Clique sur le bouton pour choisir un nouveau mot de passe. Ce lien est valable 1 heure.</p>' + mailButton(link, 'Réinitialiser mon mot de passe')));
  }
  res.render('forgot', { error: null, done: true, siteName: SITE_NAME });
});
app.get('/reset', (req, res) => {
  const token = (req.query.token || '').toString();
  const user = token ? db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token != ''").get(token) : null;
  const valid = !!(user && user.reset_expires > Date.now());
  res.render('reset', { token, valid, error: null, done: false, siteName: SITE_NAME });
});
app.post('/reset', authLimiter, (req, res) => {
  const token = (req.body.token || '').toString();
  const password = req.body.password || '';
  const user = token ? db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_token != ''").get(token) : null;
  const valid = !!(user && user.reset_expires > Date.now());
  if (!valid) return res.render('reset', { token, valid: false, error: null, done: false, siteName: SITE_NAME });
  if (password.length < 8) return res.render('reset', { token, valid: true, error: 'Le mot de passe doit faire au moins 8 caractères.', done: false, siteName: SITE_NAME });
  db.prepare("UPDATE users SET password = ?, reset_token = '', reset_expires = 0 WHERE id = ?").run(bcrypt.hashSync(password, 12), user.id);
  res.render('reset', { token, valid: true, error: null, done: true, siteName: SITE_NAME });
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('login', { error: null, username: '', unverified: false });
});
app.post('/login', authLimiter, (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const user = db.prepare('SELECT * FROM users WHERE username_lower = ?').get(username.toLowerCase());
  // Meme message d'erreur, que le pseudo existe ou non (n'aide pas a deviner les comptes existants)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).render('login', { error: 'Pseudo ou mot de passe incorrect.', username, unverified: false });
  }
  if (MAIL_ENABLED && user.email && !user.email_verified) {
    return res.status(401).render('login', { error: null, username, unverified: true });
  }
  req.session.userId = user.id;
  res.redirect('/');
});
app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// ===========================================================================
//  COMPTE (mot de passe, theme, stockage)
// ===========================================================================
const THEMES = ['dark', 'light', 'violet'];
// ===========================================================================
//  REGLAGES
// ===========================================================================
app.get('/settings', requireAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.render('settings', { u, saved: req.query.saved || '' });
});
app.post('/settings/theme', requireAuth, (req, res) => {
  const theme = THEMES.includes(req.body.theme) ? req.body.theme : 'dark';
  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.session.userId);
  res.redirect('/settings?saved=theme');
});
app.post('/settings/privacy', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET allow_stranger_requests = ?, allow_stranger_shares = ? WHERE id = ?')
    .run(req.body.allow_stranger_requests ? 1 : 0, req.body.allow_stranger_shares ? 1 : 0, req.session.userId);
  res.redirect('/settings?saved=privacy');
});
app.post('/settings/notifications', requireAuth, (req, res) => {
  db.prepare('UPDATE users SET notify_friend_request = ?, notify_share = ?, notify_message = ? WHERE id = ?')
    .run(req.body.notify_friend_request ? 1 : 0, req.body.notify_share ? 1 : 0, req.body.notify_message ? 1 : 0, req.session.userId);
  res.redirect('/settings?saved=notifications');
});
app.post('/settings/display', requireAuth, (req, res) => {
  const view = req.body.default_view === 'list' ? 'list' : 'grid';
  db.prepare('UPDATE users SET default_view = ? WHERE id = ?').run(view, req.session.userId);
  res.redirect('/settings?saved=display');
});

// ===========================================================================
//  NOTIFICATIONS
// ===========================================================================
app.get('/api/notifications', requireAuth, (req, res) => {
  const u = res.locals.me;
  const rows = db.prepare(`
    SELECT n.*, usr.username AS actor_name, usr.avatar_key AS actor_avatar
    FROM notifications n JOIN users usr ON usr.id = n.actor_id
    WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 30
  `).all(u.id);
  const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at = 0').get(u.id).c;
  res.json({ notifications: rows.map(r => ({ ...r, data: JSON.parse(r.data || '{}') })), unread });
});
app.post('/api/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at = 0').run(Date.now(), res.locals.me.id);
  res.json({ ok: true });
});

app.get('/account', requireAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  res.render('account', {
    u, fmtBytes,
    pwok: req.query.pwok === '1', pwerr: req.query.pwerr || '',
    themeok: req.query.themeok === '1',
    quotaSent: req.query.quotasent === '1',
    avatarok: req.query.avatarok === '1', avatarerr: req.query.avatarerr || '',
    bioOk: req.query.bioOk === '1'
  });
});
app.post('/account/password', requireAuth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const current = req.body.current || '', next = req.body.next || '';
  if (!bcrypt.compareSync(current, u.password)) return res.redirect('/account?pwerr=1');
  if (next.length < 8) return res.redirect('/account?pwerr=2');
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), u.id);
  res.redirect('/account?pwok=1');
});
app.post('/account/theme', requireAuth, (req, res) => {
  const theme = THEMES.includes(req.body.theme) ? req.body.theme : 'dark';
  db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.session.userId);
  res.redirect('/account?themeok=1');
});
app.post('/account/request-quota', requireAuth, async (req, res) => {
  const u = res.locals.me;
  db.prepare('UPDATE users SET quota_request_at = ? WHERE id = ?').run(Date.now(), u.id);
  const adminEmail = process.env.ADMIN_EMAIL || '';
  if (adminEmail) {
    await sendMail(adminEmail, 'Demande de stockage supplémentaire',
      mailLayout('Demande de stockage', '<p>L\'utilisateur <b>' + u.username + '</b> (' + (u.email || 'pas d\'e-mail') + ') a demandé plus de stockage.</p><p>Utilisé actuellement : ' + fmtBytes(u.storage_used) + ' / ' + fmtBytes(u.storage_quota) + '</p>'));
  }
  res.redirect('/account?quotasent=1');
});

app.post('/account/bio', requireAuth, (req, res) => {
  const bio = (req.body.bio || '').trim().slice(0, 280);
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.session.userId);
  res.redirect('/account?bioOk=1');
});

app.post('/account/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  const u = res.locals.me;
  if (!req.file) return res.redirect('/account?avatarerr=1');
  if (!r2.R2_CONFIGURED) return res.redirect('/account?avatarerr=2');
  try {
    const oldRow = db.prepare('SELECT avatar_key FROM users WHERE id = ?').get(u.id);
    const ext = (req.file.originalname.match(/\.[a-zA-Z0-9]{1,6}$/) || ['.jpg'])[0].toLowerCase();
    const key = `avatars/u${u.id}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    await r2.uploadBuffer(key, req.file.buffer, req.file.mimetype);
    db.prepare('UPDATE users SET avatar_key = ? WHERE id = ?').run(key, u.id);
    if (oldRow && oldRow.avatar_key) { try { await r2.deleteObject(oldRow.avatar_key); } catch (e) {} }
    res.redirect('/account?avatarok=1');
  } catch (e) {
    console.error('[avatar]', e);
    res.redirect('/account?avatarerr=2');
  }
});

// Photo de profil de n'importe quel utilisateur (soi-meme ou un autre) : lien signe genere a la demande
app.get('/api/avatar/:userId', requireAuth, async (req, res) => {
  const target = db.prepare('SELECT avatar_key FROM users WHERE id = ?').get(req.params.userId);
  if (!target || !target.avatar_key || !r2.R2_CONFIGURED) return res.status(404).end();
  try {
    const url = await r2.signedPreviewUrl(target.avatar_key);
    res.redirect(url);
  } catch (e) { res.status(404).end(); }
});

// Profil public d'un utilisateur (visible par tout le monde connecte)
app.get('/u/:username', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id, username, bio, avatar_key, created_at FROM users WHERE username_lower = ?').get(req.params.username.toLowerCase());
  if (!target) return res.status(404).render('404');
  const isSelf = target.id === req.session.userId;
  const [a, b] = pair(req.session.userId, target.id);
  const friendship = db.prepare('SELECT status FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b);
  res.render('profile', { target, isSelf, friendStatus: friendship ? friendship.status : 'none' });
});

app.post('/api/friends/nickname', requireAuth, (req, res) => {
  const u = res.locals.me;
  const otherId = parseInt(req.body.user_id, 10);
  const nickname = (req.body.nickname || '').trim().slice(0, 40);
  const [a, b] = pair(u.id, otherId);
  const col = u.id === a ? 'nickname_by_a' : 'nickname_by_b';
  const info = db.prepare(`UPDATE friendships SET ${col} = ? WHERE user_a = ? AND user_b = ? AND status = 'accepted'`).run(nickname || null, a, b);
  if (info.changes === 0) return res.status(404).json({ error: 'Amitié introuvable.' });
  res.json({ ok: true, nickname: nickname || null });
});

// ===========================================================================
//  GROUPES
// ===========================================================================
function isGroupMember(userId, groupId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}
function isGroupOwner(userId, groupId) {
  return !!db.prepare('SELECT 1 FROM groups_ WHERE id = ? AND owner_id = ?').get(groupId, userId);
}

app.get('/groups', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groups = db.prepare(`
    SELECT g.id, g.name, g.owner_id, (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count
    FROM groups_ g JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ? ORDER BY g.created_at DESC
  `).all(u.id);
  res.render('groups', { groups });
});

app.post('/api/groups', requireAuth, (req, res) => {
  const u = res.locals.me;
  const name = (req.body.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'Nom de groupe requis.' });
  const info = db.prepare('INSERT INTO groups_ (name, owner_id, created_at) VALUES (?,?,?)').run(name, u.id, Date.now());
  db.prepare('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?,?,?)').run(info.lastInsertRowid, u.id, Date.now());
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.get('/groups/:id', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (!isGroupMember(u.id, groupId)) return res.status(404).render('404');
  const group = db.prepare('SELECT * FROM groups_ WHERE id = ?').get(groupId);
  const members = db.prepare('SELECT usr.id, usr.username, usr.avatar_key FROM group_members gm JOIN users usr ON usr.id = gm.user_id WHERE gm.group_id = ? ORDER BY usr.username COLLATE NOCASE').all(groupId);
  const messages = db.prepare('SELECT m.*, usr.username AS sender_name FROM messages m JOIN users usr ON usr.id = m.sender_id WHERE m.group_id = ? ORDER BY m.created_at ASC LIMIT 200').all(groupId);
  res.render('group', { group, members, messages, isOwner: group.owner_id === u.id, meId: u.id });
});

app.post('/api/groups/:id/rename', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (!isGroupOwner(u.id, groupId)) return res.status(403).json({ error: 'Seul le créateur peut renommer le groupe.' });
  const name = (req.body.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'Nom requis.' });
  db.prepare('UPDATE groups_ SET name = ? WHERE id = ?').run(name, groupId);
  res.json({ ok: true });
});

app.post('/api/groups/:id/members', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (!isGroupMember(u.id, groupId)) return res.status(404).json({ error: 'Groupe introuvable.' });
  const username = (req.body.username || '').trim().toLowerCase();
  const target = db.prepare('SELECT id, username FROM users WHERE username_lower = ?').get(username);
  if (!target) return res.status(404).json({ error: `Aucun utilisateur "${req.body.username}" trouvé.` });
  if (isGroupMember(target.id, groupId)) return res.status(400).json({ error: `@${target.username} est déjà dans ce groupe.` });
  db.prepare('INSERT INTO group_members (group_id, user_id, joined_at) VALUES (?,?,?)').run(groupId, target.id, Date.now());
  res.json({ ok: true, username: target.username });
});

// Retirer quelqu'un : uniquement le createur du groupe (regle demandee explicitement)
app.post('/api/groups/:id/members/remove', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (!isGroupOwner(u.id, groupId)) return res.status(403).json({ error: 'Seul le créateur du groupe peut retirer des membres.' });
  const targetId = parseInt(req.body.user_id, 10);
  if (targetId === u.id) return res.status(400).json({ error: 'Tu ne peux pas te retirer toi-même ainsi (le groupe a besoin d\'un créateur).' });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, targetId);
  res.json({ ok: true });
});

// Quitter un groupe soi-meme (sauf le createur, qui doit d'abord transferer ou supprimer le groupe)
app.post('/api/groups/:id/leave', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (isGroupOwner(u.id, groupId)) return res.status(400).json({ error: 'En tant que créateur, tu dois supprimer le groupe plutôt que le quitter.' });
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, u.id);
  res.json({ ok: true });
});

app.post('/api/groups/:id/delete', requireAuth, (req, res) => {
  const u = res.locals.me;
  const groupId = parseInt(req.params.id, 10);
  if (!isGroupOwner(u.id, groupId)) return res.status(403).json({ error: 'Seul le créateur peut supprimer le groupe.' });
  db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM messages WHERE group_id = ?').run(groupId);
  db.prepare('DELETE FROM groups_ WHERE id = ?').run(groupId);
  res.json({ ok: true });
});

// ===========================================================================
//  MESSAGERIE (privee entre amis, et dans les groupes)
// ===========================================================================
function areFriends(userA, userB) {
  const [a, b] = pair(userA, userB);
  const f = db.prepare("SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ? AND status = 'accepted'").get(a, b);
  return !!f;
}
// Cree une notification, sauf si l'utilisateur a desactive ce type dans ses reglages
const NOTIF_PREF_COL = { friend_request: 'notify_friend_request', share: 'notify_share', message: 'notify_message' };
function notify(userId, type, actorId, data) {
  const col = NOTIF_PREF_COL[type];
  if (col) {
    const pref = db.prepare(`SELECT ${col} AS v FROM users WHERE id = ?`).get(userId);
    if (pref && pref.v === 0) return; // desactive par l'utilisateur
  }
  db.prepare('INSERT INTO notifications (user_id, type, actor_id, data, created_at) VALUES (?,?,?,?,?)')
    .run(userId, type, actorId, JSON.stringify(data || {}), Date.now());
}

// Page "Discussions" : vue d'ensemble de toutes les conversations (amis + groupes)
app.get('/messages', requireAuth, (req, res) => {
  const u = res.locals.me;
  const friends = db.prepare(`
    SELECT usr.id, usr.username, usr.avatar_key,
      (CASE WHEN f.user_a = ? THEN f.nickname_by_a ELSE f.nickname_by_b END) AS nickname,
      (SELECT content FROM messages m WHERE (m.sender_id = usr.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = usr.id) ORDER BY m.id DESC LIMIT 1) AS last_msg,
      (SELECT created_at FROM messages m WHERE (m.sender_id = usr.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = usr.id) ORDER BY m.id DESC LIMIT 1) AS last_at
    FROM friendships f
    JOIN users usr ON usr.id = (CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END)
    WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
  `).all(u.id, u.id, u.id, u.id, u.id, u.id, u.id, u.id);
  friends.sort((a, b) => (b.last_at || 0) - (a.last_at || 0));
  const groups = db.prepare(`
    SELECT g.id, g.name,
      (SELECT content FROM messages m WHERE m.group_id = g.id ORDER BY m.id DESC LIMIT 1) AS last_msg,
      (SELECT created_at FROM messages m WHERE m.group_id = g.id ORDER BY m.id DESC LIMIT 1) AS last_at
    FROM groups_ g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ?
  `).all(u.id);
  groups.sort((a, b) => (b.last_at || 0) - (a.last_at || 0));
  res.render('messages', { friends, groups });
});

app.get('/chat/friend/:userId', requireAuth, (req, res) => {
  const u = res.locals.me;
  const otherId = parseInt(req.params.userId, 10);
  const other = db.prepare('SELECT id, username, avatar_key FROM users WHERE id = ?').get(otherId);
  if (!other || !areFriends(u.id, otherId)) return res.status(404).render('404');
  const [a, b] = pair(u.id, otherId);
  const friendship = db.prepare('SELECT nickname_by_a, nickname_by_b FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b);
  const nickname = (u.id === a ? friendship.nickname_by_a : friendship.nickname_by_b) || null;
  const messages = db.prepare('SELECT * FROM messages WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?) ORDER BY created_at ASC LIMIT 300').all(u.id, otherId, otherId, u.id);
  res.render('chat', { mode: 'friend', other, nickname, groupId: null, messages, meId: u.id });
});

app.post('/api/messages/send', requireAuth, upload.single('media'), async (req, res) => {
  const u = res.locals.me;
  const content = (req.body.content || '').trim().slice(0, 2000);
  const recipientId = req.body.recipient_id ? parseInt(req.body.recipient_id, 10) : null;
  const groupId = req.body.group_id ? parseInt(req.body.group_id, 10) : null;
  if (!content && !req.file) return res.status(400).json({ error: 'Message vide.' });
  if (recipientId) {
    if (!areFriends(u.id, recipientId)) return res.status(403).json({ error: 'Vous devez être amis pour vous écrire.' });
  } else if (groupId) {
    if (!isGroupMember(u.id, groupId)) return res.status(403).json({ error: 'Tu ne fais pas partie de ce groupe.' });
  } else {
    return res.status(400).json({ error: 'Destinataire manquant.' });
  }

  let mediaKey = '', mediaMime = '', mediaName = '', mediaSize = 0;
  if (req.file) {
    const fresh = db.prepare('SELECT storage_used, storage_quota FROM users WHERE id = ?').get(u.id);
    if (fresh.storage_used + req.file.size > fresh.storage_quota) return res.status(413).json({ error: 'quota', message: `Stockage plein : il ne te reste que ${fmtBytes(Math.max(0, fresh.storage_quota - fresh.storage_used))}.` });
    if (!r2.R2_CONFIGURED) return res.status(500).json({ error: 'Le stockage n\'est pas configuré sur ce serveur.' });
    try {
      mediaName = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);
      mediaKey = r2.makeR2Key(u.id, mediaName);
      await r2.uploadBuffer(mediaKey, req.file.buffer, req.file.mimetype);
      mediaMime = req.file.mimetype || ''; mediaSize = req.file.size;
      db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(mediaSize, u.id);
    } catch (e) {
      console.error('[chat media]', e);
      return res.status(500).json({ error: 'Échec de l\'envoi du fichier.' });
    }
  }

  const now = Date.now();
  const info = db.prepare('INSERT INTO messages (sender_id, recipient_id, group_id, content, media_key, media_mime, media_name, media_size, created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(u.id, recipientId, groupId, content, mediaKey, mediaMime, mediaName, mediaSize, now);

  if (recipientId) {
    notify(recipientId, 'message', u.id, { username: u.username, preview: content ? content.slice(0, 60) : (mediaMime.startsWith('image/') ? '📷 Photo' : mediaMime.startsWith('video/') ? '🎬 Vidéo' : '📄 Fichier') });
  } else if (groupId) {
    const group = db.prepare('SELECT name FROM groups_ WHERE id = ?').get(groupId);
    const others = db.prepare('SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?').all(groupId, u.id);
    others.forEach(m => notify(m.user_id, 'message', u.id, { username: u.username, group: group ? group.name : '', preview: content ? content.slice(0, 60) : '📎 Fichier' }));
  }

  res.json({
    ok: true, id: info.lastInsertRowid, created_at: now,
    media: mediaKey ? { mime: mediaMime, name: mediaName, size: mediaSize, id: info.lastInsertRowid } : null
  });
});

// Sondage des nouveaux messages (rafraichissement simple, sans websocket)
// Acces au media d'un message (verifie que l'utilisateur fait bien partie de la conversation)
app.get('/api/messages/:id/media', requireAuth, async (req, res) => {
  const u = res.locals.me;
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg || !msg.media_key) return res.status(404).end();
  const authorized = msg.sender_id === u.id
    || (msg.recipient_id && msg.recipient_id === u.id)
    || (msg.group_id && isGroupMember(u.id, msg.group_id));
  if (!authorized) return res.status(403).end();
  try {
    const inline = (msg.media_mime || '').match(/^(image|video)\//);
    const url = inline ? await r2.signedPreviewUrl(msg.media_key) : await r2.signedDownloadUrl(msg.media_key, msg.media_name);
    res.redirect(url);
  } catch (e) { res.status(500).end(); }
});

app.get('/api/messages/poll', requireAuth, (req, res) => {
  const u = res.locals.me;
  const since = parseInt(req.query.since, 10) || 0;
  const friendId = req.query.friend ? parseInt(req.query.friend, 10) : null;
  const groupId = req.query.group ? parseInt(req.query.group, 10) : null;
  let rows = [];
  if (friendId && areFriends(u.id, friendId)) {
    rows = db.prepare('SELECT * FROM messages WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) AND created_at > ? ORDER BY created_at ASC').all(u.id, friendId, friendId, u.id, since);
  } else if (groupId && isGroupMember(u.id, groupId)) {
    rows = db.prepare(`
      SELECT m.*, usr.username AS sender_name FROM messages m JOIN users usr ON usr.id = m.sender_id
      WHERE m.group_id = ? AND m.created_at > ? ORDER BY m.created_at ASC
    `).all(groupId, since);
  }
  res.json({ messages: rows });
});

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
  const access = accessibleFile(u.id, req.params.id);
  if (!access) return res.status(404).json({ error: 'Fichier introuvable.' });
  try {
    const url = await r2.signedDownloadUrl(access.file.r2_key, access.file.name);
    res.redirect(url);
  } catch (e) {
    console.error('[download]', e);
    res.status(500).json({ error: 'Impossible de générer le lien de téléchargement.' });
  }
});

// Apercu direct (miniature image/video), affiche inline plutot que telecharge
app.get('/api/preview/:id', requireAuth, async (req, res) => {
  const u = res.locals.me;
  const access = accessibleFile(u.id, req.params.id);
  if (!access || !(access.file.mime || '').match(/^(image|video)\//)) return res.status(404).end();
  try {
    const url = await r2.signedPreviewUrl(access.file.r2_key);
    res.redirect(url);
  } catch (e) { res.status(404).end(); }
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

// Partage direct avec un autre utilisateur du site (pas juste un lien public)
app.post('/api/share/user', requireAuth, (req, res) => {
  const u = res.locals.me;
  const { type, id } = req.body;
  const targetUsername = (req.body.username || '').trim().toLowerCase();
  const table = type === 'folder' ? 'folders' : 'files';
  const col = type === 'folder' ? 'folder_id' : 'file_id';
  const item = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, u.id);
  if (!item) return res.status(404).json({ error: 'Introuvable.' });
  const target = db.prepare('SELECT id, username, allow_stranger_shares FROM users WHERE username_lower = ?').get(targetUsername);
  if (!target) return res.status(404).json({ error: `Aucun utilisateur "${req.body.username}" trouvé.` });
  if (target.id === u.id) return res.status(400).json({ error: 'Tu ne peux pas te le partager à toi-même.' });
  if (!target.allow_stranger_shares && !areFriends(u.id, target.id)) {
    return res.status(403).json({ error: `@${target.username} n'accepte les partages que de ses amis.` });
  }
  const already = db.prepare(`SELECT 1 FROM shares WHERE ${col} = ? AND user_id = ? AND shared_with_user_id = ? AND revoked_at = 0`).get(id, u.id, target.id);
  if (already) return res.json({ ok: true, username: target.username, already: true });
  const token = crypto.randomBytes(9).toString('base64url');
  db.prepare(`INSERT INTO shares (token, user_id, ${col}, shared_with_user_id, created_at) VALUES (?,?,?,?,?)`).run(token, u.id, id, target.id, Date.now());
  notify(target.id, 'share', u.id, { username: u.username, name: item.name, type });
  res.json({ ok: true, username: target.username });
});

// Liste de ce que les autres ont partage directement avec moi
// ===========================================================================
//  AMIS
// ===========================================================================
function pair(a, b) { return a < b ? [a, b] : [b, a]; }
app.get('/friends', requireAuth, (req, res) => {
  const u = res.locals.me;
  const accepted = db.prepare(`
    SELECT usr.id, usr.username, usr.avatar_key,
      (CASE WHEN f.user_a = ? THEN f.nickname_by_a ELSE f.nickname_by_b END) AS nickname
    FROM friendships f
    JOIN users usr ON usr.id = (CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END)
    WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'accepted'
    ORDER BY usr.username COLLATE NOCASE
  `).all(u.id, u.id, u.id, u.id);
  const incoming = db.prepare(`
    SELECT f.id AS friendship_id, usr.id, usr.username FROM friendships f
    JOIN users usr ON usr.id = f.requested_by
    WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'pending' AND f.requested_by != ?
  `).all(u.id, u.id, u.id);
  const outgoing = db.prepare(`
    SELECT f.id AS friendship_id, usr.id, usr.username FROM friendships f
    JOIN users usr ON usr.id = (CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END)
    WHERE (f.user_a = ? OR f.user_b = ?) AND f.status = 'pending' AND f.requested_by = ?
  `).all(u.id, u.id, u.id, u.id);
  res.render('friends', { accepted, incoming, outgoing, error: req.query.error || null });
});

app.post('/api/friends/request', requireAuth, (req, res) => {
  const u = res.locals.me;
  const username = (req.body.username || '').trim().toLowerCase();
  const target = db.prepare('SELECT id, username, allow_stranger_requests FROM users WHERE username_lower = ?').get(username);
  if (!target) return res.status(404).json({ error: `Aucun utilisateur "${req.body.username}" trouvé.` });
  if (target.id === u.id) return res.status(400).json({ error: 'Tu ne peux pas t\'ajouter toi-même.' });
  if (!target.allow_stranger_requests) return res.status(403).json({ error: `@${target.username} n'accepte pas de nouvelles demandes d'ami pour le moment.` });
  const [a, b] = pair(u.id, target.id);
  const existing = db.prepare('SELECT * FROM friendships WHERE user_a = ? AND user_b = ?').get(a, b);
  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: `Vous êtes déjà amis avec @${target.username}.` });
    return res.status(400).json({ error: 'Une demande est déjà en attente entre vous.' });
  }
  db.prepare('INSERT INTO friendships (user_a, user_b, status, requested_by, created_at) VALUES (?,?,?,?,?)').run(a, b, 'pending', u.id, Date.now());
  notify(target.id, 'friend_request', u.id, { username: u.username });
  res.json({ ok: true, username: target.username });
});

app.post('/api/friends/accept', requireAuth, (req, res) => {
  const u = res.locals.me;
  const info = db.prepare(`
    UPDATE friendships SET status = 'accepted'
    WHERE id = ? AND (user_a = ? OR user_b = ?) AND requested_by != ? AND status = 'pending'
  `).run(req.body.id, u.id, u.id, u.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Demande introuvable.' });
  res.json({ ok: true });
});

app.post('/api/friends/decline', requireAuth, (req, res) => {
  const u = res.locals.me;
  db.prepare('DELETE FROM friendships WHERE id = ? AND (user_a = ? OR user_b = ?)').run(req.body.id, u.id, u.id);
  res.json({ ok: true });
});

app.post('/api/friends/remove', requireAuth, (req, res) => {
  const u = res.locals.me;
  const otherId = parseInt(req.body.user_id, 10);
  const [a, b] = pair(u.id, otherId);
  db.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').run(a, b);
  res.json({ ok: true });
});

app.get('/shared-with-me', requireAuth, (req, res) => {
  const u = res.locals.me;
  const folders = db.prepare(`
    SELECT f.id, f.name, own.username AS shared_by FROM folders f
    JOIN shares s ON s.folder_id = f.id JOIN users own ON own.id = s.user_id
    WHERE s.shared_with_user_id = ? AND s.revoked_at = 0 AND f.trashed_at = 0
  `).all(u.id);
  const files = db.prepare(`
    SELECT f.id, f.name, f.mime, f.size, own.username AS shared_by FROM files f
    JOIN shares s ON s.file_id = f.id JOIN users own ON own.id = s.user_id
    WHERE s.shared_with_user_id = ? AND s.revoked_at = 0 AND f.trashed_at = 0
  `).all(u.id);
  res.render('shared-with-me', { folders, files, fmtBytes });
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

app.get('/s/:token/preview', async (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ? AND revoked_at = 0').get(req.params.token);
  if (!share || !share.file_id) return res.status(404).end();
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND trashed_at = 0').get(share.file_id);
  if (!file || !(file.mime || '').match(/^(image|video)\//)) return res.status(404).end();
  try {
    const url = await r2.signedPreviewUrl(file.r2_key);
    res.redirect(url);
  } catch (e) { res.status(404).end(); }
});

app.use((req, res) => res.status(404).render('404'));

if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Vault en ligne sur http://localhost:${PORT}`));
}
