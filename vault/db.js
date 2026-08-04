// ---------------------------------------------------------------------------
// Base de donnees SQLite : uniquement les METADONNEES (noms, tailles, chemins).
// Les vrais fichiers (contenu) vivent sur Cloudflare R2, jamais ici.
// ---------------------------------------------------------------------------
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'vault.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT UNIQUE NOT NULL,
  username_lower TEXT UNIQUE NOT NULL,
  email          TEXT DEFAULT '',
  email_lower    TEXT DEFAULT '',
  password       TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  storage_used   INTEGER DEFAULT 0,   -- en octets, mis a jour a chaque upload/suppression
  storage_quota  INTEGER DEFAULT 16106127360  -- 15 Go en octets, par defaut
);

CREATE TABLE IF NOT EXISTS folders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  parent_id  INTEGER,                 -- NULL = dossier racine
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  trashed_at INTEGER DEFAULT 0        -- 0 = actif, sinon horodatage de mise a la corbeille
);

CREATE TABLE IF NOT EXISTS files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  folder_id   INTEGER,                -- NULL = a la racine
  name        TEXT NOT NULL,
  r2_key      TEXT NOT NULL UNIQUE,    -- chemin exact du fichier sur R2 (jamais expose au client)
  mime        TEXT DEFAULT '',
  size        INTEGER NOT NULL,        -- en octets, taille EXACTE du fichier original (aucune compression)
  created_at  INTEGER NOT NULL,
  trashed_at  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shares (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT UNIQUE NOT NULL,    -- partie aleatoire du lien /s/:token (toujours genere, meme pour un partage direct)
  user_id     INTEGER NOT NULL,        -- proprietaire (pour verification / revocation)
  file_id     INTEGER,                 -- soit un fichier...
  folder_id   INTEGER,                 -- ...soit un dossier (jamais les deux a la fois)
  can_edit    INTEGER DEFAULT 0,       -- reserve pour plus tard (partage en lecture seule pour l'instant)
  created_at  INTEGER NOT NULL,
  revoked_at  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON folders(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_files_user_folder ON files(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
`);

// Migrations (ajout de colonnes sur une base deja existante, sans rien casser)
const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
const addCol = (name, def) => { if (!cols.includes(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`); };
addCol('email',            "TEXT DEFAULT ''");
addCol('email_lower',      "TEXT DEFAULT ''");
addCol('email_verified',   "INTEGER DEFAULT 0");
addCol('verify_token',     "TEXT DEFAULT ''");
addCol('reset_token',      "TEXT DEFAULT ''");
addCol('reset_expires',    "INTEGER DEFAULT 0");
addCol('theme',             "TEXT DEFAULT 'dark'");
addCol('quota_request_at', "INTEGER DEFAULT 0"); // horodatage de la derniere demande de plus de stockage
addCol('bio', "TEXT DEFAULT ''");
addCol('avatar_key', "TEXT DEFAULT ''"); // cle R2 de la photo de profil (vide = aucune)

// Migration equivalente pour la table shares (partage direct entre utilisateurs)
const shareCols = db.prepare("PRAGMA table_info(shares)").all().map(c => c.name);
if (!shareCols.includes('shared_with_user_id')) db.exec('ALTER TABLE shares ADD COLUMN shared_with_user_id INTEGER');
db.exec('CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with_user_id)');
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(email_lower) WHERE email_lower != ''");

// ---------------------------------------------------------------------------
// Amis, groupes, messagerie
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS friendships (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a       INTEGER NOT NULL,   -- toujours le plus petit id des deux (evite les doublons a-b / b-a)
  user_b       INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' ou 'accepted'
  requested_by INTEGER NOT NULL,   -- qui a envoye la demande (pour savoir qui doit l'accepter)
  created_at   INTEGER NOT NULL,
  UNIQUE(user_a, user_b)
);

CREATE TABLE IF NOT EXISTS groups_ (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  owner_id   INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    INTEGER NOT NULL,
  recipient_id INTEGER,     -- renseigne pour un message prive (a un ami)
  group_id     INTEGER,     -- renseigne pour un message de groupe (jamais les deux a la fois)
  content      TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a, status);
CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b, status);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_dm ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id, created_at);
`);

// Migration defensive (au cas ou friendships aurait deja ete deployee sans ces colonnes)
const friendCols = db.prepare("PRAGMA table_info(friendships)").all().map(c => c.name);
if (!friendCols.includes('nickname_by_a')) db.exec('ALTER TABLE friendships ADD COLUMN nickname_by_a TEXT');
if (!friendCols.includes('nickname_by_b')) db.exec('ALTER TABLE friendships ADD COLUMN nickname_by_b TEXT');

module.exports = db;
