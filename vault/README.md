# Vault — stockage et partage de fichiers sécurisé

Stack : Node.js + Express + SQLite (métadonnées) + Cloudflare R2 (vrais fichiers) + EJS.

## Pourquoi Cloudflare R2 et pas juste un disque Railway ?

Les **métadonnées** (noms, tailles, dossiers) sont dans une petite base SQLite locale.
Les **vrais fichiers** (photos, vidéos) sont stockés sur **Cloudflare R2**, un service
de stockage dédié bien plus fiable qu'un simple disque, et qui ne facture jamais le
téléchargement (contrairement à Google Drive/AWS S3). Aucune compression : chaque
fichier est stocké octet pour octet identique à l'original.

## Mise en route

### 1. Créer le bucket Cloudflare R2

1. Va sur [dash.cloudflare.com](https://dash.cloudflare.com/) → **R2 Object Storage** → **Create bucket**
2. Nomme-le (ex: `vault-files`) — note aussi ton **Account ID** (visible dans l'URL ou en bas à droite de R2)
3. Va dans **Manage R2 API Tokens** → **Create API Token**
   - Permissions : **Object Read & Write**
   - Limite au bucket créé si tu veux être précis
4. Copie les 2 clés générées (elles ne seront affichées qu'une seule fois)

### 2. Variables d'environnement (sur Railway : onglet "Variables")

Voir `.env.example` pour la liste complète. Les indispensables :
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=vault-files
SESSION_SECRET=une-longue-chaine-aleatoire
```

### 3. Volume Railway (pour la base SQLite des métadonnées uniquement)

Ajoute un volume monté sur `/data`, et mets `DATA_DIR=/data`. Les fichiers eux-mêmes
ne sont PAS sur ce volume (ils sont sur R2) — ce volume ne contient que la petite
base de métadonnées, donc pas de souci de taille.

### 4. Lancer en local

```
npm install
npm start
```

## Limites connues (honnêteté sur ce qui n'est pas encore fait)

- Téléchargement d'un **dossier entier** en un clic (zip) : pas encore implémenté — le
  message "arrive bientôt" s'affiche si on essaie.
- Partage avec **permission d'édition** : le partage actuel est en lecture seule uniquement.
- Fichiers de plus de **1 Go** : refusés pour l'instant (limite technique de mémoire serveur,
  pas de R2). Peut être augmenté si besoin.
