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

## Modèle de données

```
users      (id, email, password_hash, name, created_at, last_login_at)
grids      (id, user_id, name, created_at)          
levels     (id, grid_id, position 0..4, label, pct)     
categories (id, grid_id, position, name)
criteria   (id, grid_id, category_id, position, name, weight)
groups     (id, grid_id, name)
students   (id, grid_id, group_id, last_name, first_name, comment)
marks      (student_id, criterion_id, level_position)
```

## Démarrer

### Avec Docker 

```bash
cp .env.example .env   # renseigner les mots de passe MySQL + JWT_SECRET
docker compose up --build
```

Front sur http://localhost, phpMyAdmin sur http://localhost:8080. Le schéma
MySQL (`server/src/db/schema.sql`) est appliqué automatiquement au démarrage du conteneur `back`.

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
- [ ] Mettre le tout en application éléctron fonctionnel avec un .exe qui installe l'appli sur la machine. Pas de demande admin pour installer ni de mode developpeur c'est pour des personnes qui ne peuvent pas changer les droits ni les options.