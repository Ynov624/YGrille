# YGrille

YGrille évalue les compétences. L'application gère des grilles de critères pondérés, 5 niveaux d'acquisition, le calcul de la note sur 20, les bilans PDF et les exports CSV Pronote.

---

## Documentation Complète

Consultez la documentation technique dans [`docs/`](./docs/README.md) :

* **[Architecture Technique](./docs/architecture.md)** : Monorepo, flux applicatifs, calcul des notes (`grade.js`), génération PDF et sécurité.

* **[Modèle de Données & SQLite (Turso)](./docs/database.md)** : Schéma relationnel, diagramme ERD, index, contraintes et CLI.

* **[Spécification de l'API REST](./docs/api.md)** : Endpoints d'authentification, gestion des grilles, élèves, groupes, notes et administration.

* **[Guide de Déploiement & Exploitation](./docs/deployment.md)** : Variables d'environnement, développement local, Vercel, Docker et Electron.

---

## Stack Technique

| Couche | Technologie | Rôle |
| --- | --- | --- |
| **Client** | React 18 + Vite + React Router | Single Page Application, Vanilla CSS, génération PDF/ZIP côté client |
| **Serveur** | Node.js + Express (ESM) | API REST modulaire (contrôleurs, services, validation) |
| **Base de données** | SQLite hébergé sur Turso (`@libsql/client`) | Fichier local en dev, cluster cloud HTTP en production |
| **Authentification** | JWT + bcrypt + OTP E-mail | Validation stricte `@ynov.com`, conformité CNIL, Resend |
| **Hébergement** | Vercel | Client statique sur CDN + API Express en fonction serverless |
| **Desktop** | Electron + electron-builder | Application de bureau avec serveur Express autonome intégré |

---

## Arborescence du Projet

```text
YGrille/
├── docs/                      # Documentation technique complète
├── vercel.json                # Routage Vercel, build client, région dub1
├── api/index.mjs              # Point d'entrée Vercel (fonction serverless Express)
├── docker-compose.yml         # Déploiement auto-hébergé multi-conteneurs
├── package.json               # Workspaces npm + scripts globaux
├── client/                    # Frontend (React 18 + Vite)
│   ├── Dockerfile             # Build Vite → Nginx
│   ├── vite.config.js         # Proxy de développement /api → http://localhost:3001
│   └── src/                   # Code source SPA (pages, composants, grade.js, pdf.js)
├── server/                    # Backend API (Node.js + Express)
│   ├── Dockerfile             # Conteneur Node.js
│   └── src/                   # API REST, contrôleurs, services, DB et auth
└── electron/                  # Intégration desktop Electron
    ├── main.js                # Processus principal (Express local + Chromium)
    └── config.example.js      # Exemple de configuration des clés desktop
```

## Modèle de données

```text
users                    (id, email, password_hash, name, role, email_verified_at, created_at, last_login_at)
email_verification_codes (user_id, code_hash, expires_at, attempts, created_at)
grids                    (id, user_id, name, created_at)
levels                   (id, grid_id, position 0..4, label, pct)
categories               (id, grid_id, position, name, deliverable)
criteria                 (id, grid_id, category_id, position, name, weight)
groups                   (id, grid_id, name)
students                 (id, grid_id, group_id, last_name, first_name, comment)
marks                    (student_id, criterion_id, level_position, comment)
promos                   (id, name, created_at)
promo_students           (id, promo_id, last_name, first_name)
```

## Démarrer

### En local

```bash
npm install
cp server/.env.example server/.env   # renseigner au moins JWT_SECRET
npm run dev
```

Le client écoute sur [http://localhost:5173](http://localhost:5173) et l'API sur [http://localhost:3001](http://localhost:3001). Sans `TURSO_DATABASE_URL`, le serveur crée un fichier SQLite local (`server/data/ygrille.db`). Sans `RESEND_API_KEY`, le terminal affiche le code de vérification.

### Base Turso (production)

La base `ygrille` est sur Turso (`ynov624`, région `aws-eu-west-1`). Appliquez le schéma manuellement à la création et après chaque modification de `schema.sql` :

```bash
TURSO_DATABASE_URL=$(turso db show ygrille --url) \
TURSO_AUTH_TOKEN=$(turso db tokens create ygrille) \
npm run db:init -w server
```

### Vercel

Le projet Vercel pointe sur la racine. Le fichier `vercel.json` définit l'installation, le build, la redirection `/api/*` et la région. Définissez ces variables d'environnement :

| Variable | Rôle |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://ygrille-ynov624.aws-eu-west-1.turso.io` |
| `TURSO_AUTH_TOKEN` | `turso db tokens create ygrille` |
| `JWT_SECRET` | secret aléatoire (changer = déconnecter tout le monde) |
| `RESEND_API_KEY` | envoi du code de vérification à l'inscription |
| `MAIL_FROM` | expéditeur, sur un domaine vérifié chez Resend |

### Administrateurs

Le rôle `admin` donne accès au panneau d'administration. Le serveur vérifie ce rôle en base à chaque requête. Les administrateurs nomment d'autres administrateurs via l'interface. Nommez le premier administrateur en ligne de commande :

```bash
TURSO_DATABASE_URL=$(turso db show ygrille --url) \
TURSO_AUTH_TOKEN=$(turso db tokens create ygrille) \
npm run user:role -w server -- prenom.nom@ynov.com admin
```

### Avec Docker

```bash
cp .env.example .env   # variables Turso, JWT_SECRET, Resend
docker compose up --build
```

Le client écoute sur [http://localhost](http://localhost).

## Feuille de route

* [x] Création de grille (nom, critères pondérés, 5 niveaux + barème %)

* [x] Édition et suppression de grille

* [x] Gestion des étudiants (manuel et import CSV)

* [x] Saisie des évaluations (groupe et individuel)

* [x] Note /20 automatique et appréciation

* [x] Note par catégorie, refonte de l'assignation des critères et pondération

* [x] La pondération dépend de la note de la catégorie

* [x] Points par critère avec appréciations

* [x] Export PDF (individuel ou global)

* [x] PDF fidèle au design web en format paysage

* [x] Export CSV des notes (Pronote)

* [x] Aperçu et export de grille vierge

* [x] Amélioration UI/UX

* [x] Authentification (e-mail et mot de passe, restreint à @ynov.com)

* [ ] Mode clair

* [x] Duplication de grille

* [x] Service d'authentification JWT et isolation des grilles par utilisateur

* [x] Mot de passe norme CNIL

* [x] Vérification d'e-mail avec code OTP

* [x] Correction du bug de focus des champs

* [x] Migration SQLite sur Turso et déploiement Vercel

* [x] Rôles en base de données

* [ ] Application Electron sans droits administrateur (obsolète suite à la version web)
