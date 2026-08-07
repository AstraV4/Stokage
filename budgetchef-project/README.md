# BudgetChef Pro

Application de planification de repas économiques, générée avec React + Vite + Tailwind CSS.

## Contenu

- 100 recettes (petit-déjeuner, déjeuner, dîner)
- Génération de menu qui respecte ton budget, ton équipement, tes régimes et tes goûts
- Comparaison de prix sur 12 enseignes
- Liste de courses avec estimation de prix par article
- Illustrations de plats générées + support de vraies photos (via l'API Pexels, gratuite)

## Développement en local

```bash
npm install
npm run dev
```
Le site est alors accessible sur http://localhost:5173

## Build de production (testé, fonctionne)

```bash
npm run build
npm run start
```

## Déploiement sur GitHub + Railway

1. Crée un nouveau dépôt sur GitHub et pousse ce dossier entier (`git init`, `git add .`, `git commit`, `git push`)
2. Sur [railway.app](https://railway.app), clique "New Project" → "Deploy from GitHub repo" → sélectionne ce dépôt
3. Railway détecte automatiquement `railway.json` : il installe les dépendances, fait le build, puis démarre le site
4. Aucune variable d'environnement n'est obligatoire pour que le site fonctionne

## Activer les vraies photos de plats (optionnel)

1. Crée un compte gratuit sur [pexels.com/api](https://www.pexels.com/api/) (aucune carte bancaire requise)
2. Copie ta clé API
3. Ouvre `src/App.jsx`, cherche la ligne `const PEXELS_API_KEY = '';` et colle ta clé entre les guillemets
4. Repousse le changement sur GitHub — Railway redéploiera automatiquement

Sans clé, l'application affiche automatiquement une illustration dessinée à la place de chaque plat — le site fonctionne dans tous les cas.
