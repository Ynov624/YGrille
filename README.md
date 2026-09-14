# Grilles de notation

Application d'évaluation par compétences : grilles de critères pondérés,
5 niveaux d'acquisition, note automatique /20, exports PDF et CSV (Hyperplanning).

## Stack

| Couche      | Techno                                                          |
|-------------|-----------------------------------------------------------------|
| Client      | React 18 + Vite + React Router                                  |
| Serveur     | Node.js + Express                                               |
| Base        | SQLite hébergé sur Turso (`@libsql/client`)                     |
| Auth        | JWT (Bearer token, `jsonwebtoken`)                              |
| Hébergement | Vercel : client en statique, API Express en fonction serverless |

## Arborescence

```
YGrille/
├── vercel.json                # build du client, /api/* → fonction, région dub1 (Dublin)
├── api/index.mjs              # point d'entrée Vercel : exporte l'app Express
├── docker-compose.yml         # alternative auto-hébergée : front (nginx) + back
├── package.json               # workspaces npm + script `npm run dev`
├── client/                    # Front (Vite + React)
│   ├── Dockerfile             # build Vite → nginx (proxy /api → back)
│   ├── nginx.conf
│   ├── vite.config.js         # proxy /api → http://localhost:3001 (dev)
│   └── src/
│       ├── main.jsx           # point d'entrée
│       ├── App.jsx            # routing
│       ├── auth/              # AuthContext (token JWT) + écran de connexion
│       ├── api/               # client HTTP (fetch) par ressource
│       ├── styles/            # CSS global
│       └── features/
│           ├── admin/         # panneau admin (promos)
│           └── grids/         # module « grilles »
│               ├── pages/       # écrans (liste, création…)
│               ├── components/  # éditeurs de critères / niveaux
│               └── defaults.js  # niveaux d'acquisition par défaut
└── server/                    # API (Express)
    ├── Dockerfile
    └── src/
        ├── index.js           # démarrage HTTP (dev, Docker, Electron)
        ├── app.js             # instance Express + middlewares + routes
        ├── auth/
        │   ├── jwt.js         # signature/vérification des tokens
        │   └── authValidate.js
        ├── db/
        │   ├── connection.js  # client libSQL (Turso ou fichier local) + all/get/run/batch
        │   ├── init.js        # `npm run db:init -w server` : applique le schéma
        │   └── schema.sql     # schéma complet
        ├── routes/            # déclaration des endpoints
        ├── controllers/       # HTTP ⇄ services (parsing, statuts, erreurs)
        ├── services/          # logique métier + accès base
        └── utils/             # validation, erreurs applicatives
```

## Modèle de données

```
users                    (id, email, password_hash, name, email_verified_at, created_at, last_login_at)
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
cp server/.env.example server/.env   # renseigner au moins JWT_SECRET et ADMIN_PASSWORD
npm run dev
```

Front sur http://localhost:5173, API sur http://localhost:3001. Sans
`TURSO_DATABASE_URL`, la base est un fichier SQLite local (`server/data/ygrille.db`),
créé et initialisé au démarrage. Sans `RESEND_API_KEY`, le code de vérification
envoyé à l'inscription s'affiche dans la console du serveur.

### Base Turso (production)

Base `ygrille` (organisation Turso `ynov624`, région `aws-eu-west-1`). Le schéma
s'applique à la main, une fois à la création puis après chaque modification de
`schema.sql` (les fonctions Vercel ne le rejouent pas à chaque démarrage) :

```bash
TURSO_DATABASE_URL=$(turso db show ygrille --url) \
TURSO_AUTH_TOKEN=$(turso db tokens create ygrille) \
npm run db:init -w server
```

### Vercel

Le projet Vercel pointe sur la racine du dépôt ; `vercel.json` définit l'installation,
le build du client, la redirection de `/api/*` vers la fonction Express et la région.
Variables d'environnement à définir sur le projet :

| Variable             | Rôle                                                        |
|----------------------|-------------------------------------------------------------|
| `TURSO_DATABASE_URL` | `libsql://ygrille-ynov624.aws-eu-west-1.turso.io`           |
| `TURSO_AUTH_TOKEN`   | `turso db tokens create ygrille`                            |
| `JWT_SECRET`         | secret aléatoire (changer = déconnecter tout le monde)      |
| `ADMIN_PASSWORD`     | mot de passe du panneau admin (vide = panneau fermé)        |
| `RESEND_API_KEY`     | envoi du code de vérification à l'inscription               |
| `MAIL_FROM`          | expéditeur, sur un domaine vérifié chez Resend              |

### Avec Docker

```bash
cp .env.example .env   # variables Turso, JWT_SECRET, ADMIN_PASSWORD, Resend
docker compose up --build
```

Front sur http://localhost.

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
- [ ] White mode
- [x] Bouton pour dupliquer une grille
- [x] Faire un service d'auth avec les tokens JWT et les grilles doivent dépendre des users
- [x] Mettre le password norme CNIL
- [x] Verification mail lors de l'inscription (envoie de mail + verification avec code)
- [x] Le focus des champs ne marche plus a certain moment on ne sait pas pourquoi.
- [x] Migration MySQL (Clever Cloud) → Turso et déploiement web sur Vercel, accessible depuis YOutils
- [ ] Mettre le tout en application éléctron fonctionnel avec un .exe qui installe l'appli sur la machine. Pas de demande admin pour installer ni de mode developpeur c'est pour des personnes qui ne peuvent pas changer les droits ni les options. (rendu en grande partie inutile par la version web)
