// ---------------------------------------------------------------------------
// Client Cloudflare R2 (stockage S3-compatible).
// Variables d'environnement necessaires (voir README) :
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// ---------------------------------------------------------------------------
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_CONFIGURED = !!(R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && R2_BUCKET);

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
});

// Genere une cle de stockage unique et imprevisible (jamais devinable), organisee par utilisateur.
// Le nom d'origine n'est PAS utilise dans la cle (evite les collisions et les caracteres a risque).
function makeR2Key(userId, originalName) {
  const ext = (originalName.match(/\.[a-zA-Z0-9]{1,10}$/) || [''])[0].toLowerCase();
  const rand = crypto.randomBytes(20).toString('hex');
  return `u${userId}/${rand}${ext}`;
}

async function checkConnection() {
  if (!R2_CONFIGURED) return { ok: false, reason: 'not_configured' };
  try {
    await s3.send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Upload direct depuis un buffer en memoire (fichier deja recu par multer, jamais ecrit sur disque local)
async function uploadBuffer(key, buffer, mime) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: mime || 'application/octet-stream'
  }));
}

async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

// Lien de telechargement temporaire et signe (l'utilisateur telecharge directement depuis R2,
// notre serveur ne fait jamais transiter le fichier lui-meme : plus rapide, moins de charge).
async function signedDownloadUrl(key, filename, expiresIn = 300) {
  const cmd = new GetObjectCommand({
    Bucket: R2_BUCKET, Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"`
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

// Lien signe pour AFFICHER le fichier (image/video) directement dans le navigateur,
// sans forcer un telechargement — utilise pour les apercus/miniatures.
async function signedPreviewUrl(key, expiresIn = 600) {
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, ResponseContentDisposition: 'inline' });
  return getSignedUrl(s3, cmd, { expiresIn });
}

module.exports = { R2_CONFIGURED, makeR2Key, checkConnection, uploadBuffer, deleteObject, signedDownloadUrl, signedPreviewUrl };
