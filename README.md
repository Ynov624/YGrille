# Grilles de notation

Application d'évaluation par compétences : grilles de critères pondérés,
5 niveaux d'acquisition, note automatique /20, exports PDF et CSV (Hyperplanning).

## Stack

| Couche   | Techno                                   |
|----------|------------------------------------------|
| Client   | React 18 + Vite + React Router           |
| Serveur  | Node.js + Express                        |
| Base     | MySQL (`mysql2`)                         |
| Auth     | JWT (Bearer token, `jsonwebtoken`)       |
| Infra    | Docker Compose (front, back, mysql, phpMyAdmin) |

## Arborescence

```
grilles-notation/
├── docker-compose.yml         # front + back + mysql + phpMyAdmin
├── package.json               # workspaces npm + script `npm run dev`
├── client/                    # Front (Vite + React)
│   ├── Dockerfile             # build Vite → nginx (proxy /api → back)
│   ├── nginx.conf
│   ├── vite.config.js         # proxy /api → http://localhost:3001 (dev)
│   └── src/
│       ├── main.jsx           # point d'entrée
│       ├── App.jsx            # routing
│       ├── auth/              # AuthContext (token JWT) + écran de connexion
│       ├── api/                # client HTTP (fetch) par ressource
│       ├── styles/             # CSS global
│       └── features/
│           └── grids/          # module « grilles »
│               ├── pages/        # écrans (liste, création…)
│               ├── components/   # éditeurs de critères / niveaux
│               └── defaults.js   # niveaux d'acquisition par défaut
└── server/                    # API (Express)
    ├── Dockerfile
    └── src/
        ├── index.js          # démarrage HTTP
        ├── app.js            # instance Express + middlewares + routes
        ├── auth/
        │   ├── jwt.js         # signature/vérification des tokens
        │   └── authValidate.js
        ├── db/
        │   ├── connection.js # pool MySQL + exécution du schéma
        │   └── schema.sql    # schéma complet (tables futures incluses)
        ├── routes/           # déclaration des endpoints
        ├── controllers/      # HTTP ⇄ services (parsing, statuts, erreurs)
        ├── services/         # logique métier + accès base
        └── utils/            # validation, erreurs applicatives
```

Principe : `route → controller → service → db`. Les controllers ne contiennent
aucune logique métier ; les services ne connaissent pas Express.

## Modèle de données

```
users      (id, email, password_hash, name, created_at, last_login_at)
grids      (id, user_id, name, created_at)          -- une grille appartient à un user
levels     (id, grid_id, position 0..4, label, pct)     
categories (id, grid_id, position, name)
criteria   (id, grid_id, category_id, position, name, weight)
groups     (id, grid_id, name)
students   (id, grid_id, group_id, last_name, first_name, comment)
marks      (student_id, criterion_id, level_position)
```

Toutes les clés étrangères sont en `ON DELETE CASCADE` (ou `SET NULL` pour
`students.group_id`) : supprimer un compte supprime ses grilles et tout ce qui
en dépend. ⚠️ Sous MySQL/InnoDB, une contrainte doit être déclarée avec une
clause `FOREIGN KEY (...) REFERENCES ...` **au niveau table** dans
`schema.sql` — la syntaxe `col TYPE REFERENCES table(id)` au niveau colonne
est acceptée mais silencieusement ignorée (aucune erreur, mais aucune
contrainte réelle).

## Démarrer

### Avec Docker (recommandé)

```bash
cp .env.example .env   # renseigner les mots de passe MySQL + JWT_SECRET
docker compose up --build
```

Front sur http://localhost, phpMyAdmin sur http://localhost:8080. Le schéma
MySQL (`server/src/db/schema.sql`) est appliqué automatiquement au démarrage
du conteneur `back`.

### Sans Docker

Il faut un serveur MySQL accessible (local ou le conteneur `mysql` du compose
lancé seul : `docker compose up -d mysql`). Copier `server/.env.example` en
`server/.env` et renseigner `JWT_SECRET` + les variables `DB_*` (host, user,
mot de passe, nom de la base).

```bash
npm install
npm run dev          # lance l'API (3001) et Vite (5173)
```

Puis ouvrir http://localhost:5173.

### Authentification

L'accès à l'app est protégé par un compte (e-mail + mot de passe), réservé
aux adresses `@ynov.com`. L'auth est stateless : à la connexion/inscription,
le serveur renvoie un **token JWT** (`server/src/auth/jwt.js`, signé avec
`JWT_SECRET`, valable 7 jours) que le client stocke en `localStorage` et
renvoie dans l'en-tête `Authorization: Bearer <token>` sur chaque requête
(voir `client/src/api/client.js` + `client/src/auth/AuthContext.jsx`). Chaque
grille appartient à son créateur (`grids.user_id`) — impossible d'accéder aux
grilles d'un autre compte. Le premier compte se crée via l'écran « Créer un
compte » de la page de connexion.

L'inscription ne délivre pas de token immédiatement : un code à 6 chiffres
est envoyé par e-mail (Resend, `server/src/services/mail.service.js`,
`RESEND_API_KEY`/`MAIL_FROM` dans `.env`) et doit être validé via
`POST /api/auth/verify-email` (code valable 15 min, 5 tentatives max —
`server/src/services/emailVerification.service.js`) avant de recevoir le
token. La connexion est bloquée tant que le compte n'est pas vérifié
(`POST /api/auth/resend-code` permet de renvoyer un code).

## Build .exe (application desktop, Electron)

`electron/` packageait auparavant l'app avec une base SQLite embarquée ; ça
ne fonctionnait plus depuis le passage à MySQL. L'app desktop se connecte
maintenant à un **MySQL hébergé partagé** (add-on Clever Cloud) — toutes les
installations pointent vers la même base, comme la version web/Docker mais
sans avoir besoin d'installer quoi que ce soit d'autre sur la machine.

- `electron/config.js` (non versionné, voir `electron/config.example.js`)
  contient les identifiants de connexion (`DB_*`) et `RESEND_API_KEY`/
  `MAIL_FROM` — à copier depuis le template et renseigner avant de lancer
  `npm run electron` ou `npm run dist`.
- `electron/main.js` démarre le serveur Express en local (port 17321),
  génère et persiste un `JWT_SECRET` par installation (`userData/
  jwt-secret.txt`), puis applique le schéma (`initDatabase()`) sur la base
  distante avant d'ouvrir la fenêtre.
- `npm run electron` : build + lance l'app en mode dev (fenêtre Electron).
- `npm run dist` : build + génère l'installeur Windows (NSIS) dans
  `release/`. Install par utilisateur (`perMachine: false`), pas de droits
  admin requis.
- `npm run dist:mac` : build + génère un `.dmg`/`.zip` macOS (Intel + Apple
  Silicon selon l'architecture de la machine) dans `release/`. **Doit être
  lancé sur un Mac** — electron-builder ne peut pas produire de binaire
  macOS depuis Windows/Linux (restriction Apple). L'app n'étant pas signée
  (`identity: null`, pas de compte développeur Apple), Gatekeeper affichera
  un avertissement « développeur non identifié » ; l'utilisateur doit faire
  clic droit → Ouvrir (ou `xattr -cr /Applications/YGrid.app`) la première
  fois.
- `npm run dist:linux` : build + génère un `.AppImage` dans `release/` (un
  seul fichier exécutable, pas d'installation ni droits root nécessaires —
  `chmod +x` puis double-clic ou `./YGrid-*.AppImage`). **Doit être lancé
  sur une machine Linux** (ou WSL2/Docker) — electron-builder ne peut pas
  produire l'AppImage depuis Windows natif (l'outil de packaging est un
  binaire Linux).

⚠️ Les identifiants de connexion à la base et la clé Resend sont embarqués
tels quels dans l'installeur (`asar: false`) — n'importe qui peut les
extraire du fichier packagé. Acceptable pour un usage restreint (école,
diffusion limitée), à ne pas distribuer publiquement sans revoir ce point.

## Feuille de route

- [x] Création de grille (nom, critères pondérés, 5 niveaux + barème %)
- [x] Édition / suppression de grille
- [x] Gestion des étudiants (manuel + Import CSV)
- [x] Saisie des évaluations (vue groupe + vue individuelle)
- [x] Note /20 automatique + appréciation
- [x] Note par catégorie + refonte de la section catégorie pour que ce soit plus simple d'assigner les critères aux catégories + ajout de la pondération (addition de tout les criteres dans chaque catégorie et ponderation sur chaque critère)
- [x] La pondération dépend de la note de la catégorie pas de la note final
- [x] Point donné pour chaque critère (pondération) avec appréciations pour chaque critère.
- [x] Export PDF (par étudiant / tous)
- [x] PDF qui a exactement la forme de la grille avec le design comme sur le site en format paysage
- [x] Export CSV des notes (Hyperplanning)
- [x] Aperçu de la grille vierge dans la création de la grille. Possibilité d'export de la grille vierge.
- [x] Travail sur l'UI/UX
- [x] Auth (e-mail + mot de passe, restreint à @ynov.com)
- White mode
- [x] Bouton pour dupliquer une grille
- [x] Faire un service d'auth avec les tokens JWT et les grilles doivent dépendre des users
- [x] Mettre le password norme CNIL
- [x] Verification mail lors de l'inscription (envoie de mail + verification avec code)
- [x] Le focus des champs ne marche plus a certain moment on ne sait pas pourquoi.
- Mettre le tout en application éléctron fonctionnel avec un .exe qui installe l'appli sur la machine. Pas de demande admin pour installer ni de mode developpeur c'est pour des personnes qui ne peuvent pas changer les droits ni les options.