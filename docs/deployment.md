# Guide de Déploiement et d'Exploitation

Ce guide détaille les variables d'environnement, les modes d'exécution, l'initialisation de la base de données et la sécurité.

## 1. Variables d'Environnement

- `JWT_SECRET` : Obligatoire (production). Signe et vérifie les jetons JWT. Le changer déconnecte tous les utilisateurs.

- `TURSO_DATABASE_URL` : Obligatoire (production). URL de la base libSQL (`libsql://...`) ou chemin SQLite local (`file:...`).

- `TURSO_AUTH_TOKEN` : Jeton d'authentification Turso.

- `RESEND_API_KEY` : Obligatoire (production). Clé d'API Resend pour expédier les e-mails.

- `MAIL_FROM` : Adresse de l'expéditeur (ex: `"onboarding@resend.dev"`).

- `PORT` : Port du serveur Express (défaut: `3001`).

- `CLIENT_DIST` : Chemin absolu vers le dossier de build du client statique.

## 2. Développement Local

### 2.1. Prérequis

- Node.js 20.x ou supérieur.

- npm 10.x ou supérieur.

### 2.2. Installation et démarrage

1. Installez les dépendances : `npm install`.

2. Configurez l'environnement : `cp server/.env.example server/.env`. Renseignez `JWT_SECRET`.

3. Lancez le développement : `npm run dev`.

Cette commande démarre le client Vite (`http://localhost:5173`) et l'API Express (`http://localhost:3001`). Le proxy relaie les requêtes `/api/*` vers l'API.

Sans clé Resend locale, le terminal affiche directement le code de vérification.

### 2.3. Initialiser un compte administrateur

Après l'inscription web, attribuez les droits administrateur avec cette commande :
`npm run user:role -w server -- prenom.nom@ynov.com admin`.

## 3. Déploiement Cloud sur Vercel (Production)

Le réseau Edge Vercel distribue le client React. Une fonction serverless Node.js exécute l'API Express.

### 3.1. Fichier `vercel.json`

Ce fichier configure la distribution. La région `dub1` (Dublin) minimise la latence avec la base Turso en Irlande.

### 3.2. Configuration Vercel

Ajoutez ces variables dans Vercel : `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`.

### 3.3. Initialisation du schéma

Initialisez la base Turso manuellement :

```bash
TURSO_DATABASE_URL=$(turso db show ygrille --url) \
TURSO_AUTH_TOKEN=$(turso db tokens create ygrille) \
npm run db:init -w server
```

## 4. Déploiement Docker

Le fichier `docker-compose.yml` auto-héberge l'application.

- **`client`** : Nginx sert les fichiers statiques et redirige `/api/` vers le backend.

- **`server`** : Node.js exécute le serveur Express.

1. Créez le fichier d'environnement : `cp .env.example .env`.

2. Remplissez les variables dans `.env`.

3. Démarrez les conteneurs : `docker compose up --build -d`.

L'application écoute sur `http://localhost`.

## 5. Build Desktop avec Electron

Electron package l'application pour Windows, macOS ou Linux.

### 5.1. Fonctionnement interne

Electron démarre Express sur `127.0.0.1:17321`. Il crée un `JWT_SECRET` unique. Il charge `config.js` et ouvre Chromium sur `http://localhost:17321/`.

### 5.2. Préparation et compilation

1. Renseignez les clés : `cp electron/config.example.js electron/config.js`.

2. Testez : `npm run electron`.

3. Compilez : `npm run dist` (Windows), `npm run dist:mac` (macOS), `npm run dist:linux` (Linux).
