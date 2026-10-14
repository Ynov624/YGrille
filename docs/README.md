# Documentation Technique - YGrille

**YGrille** évalue les compétences et génère des grilles de notation pour l'enseignement supérieur.

## 1. [Architecture Technique](./architecture.md)

* **Vue d'ensemble** : Monorepo avec npm workspaces, frontend, backend et serverless.
* **Architecture** : Interactions entre client SPA, API Express, base Turso et service Resend.
* **Calcul des notes (`grade.js`)** : Barème en 5 niveaux, pondération par catégorie, moyenne sur 20 et appréciations automatiques.
* **Génération de documents** : Bilans PDF (`jspdf`), compression ZIP (`jszip`), exports CSV (Pronote/Excel) et transfert JSON.
* **Sécurité** : Restriction de domaine (`@ynov.com`), mots de passe conformes CNIL et double vérification par e-mail.

## 2. [Base de Données et Schéma SQL](./database.md)

* **Moteur LibSQL (Turso)** : SQLite local (`server/data/ygrille.db`) et Turso Cloud.
* **Diagramme Entité-Association** : Relations entre utilisateurs, grilles, catégories, critères, groupes, étudiants, notes et promotions.
* **Tables** : Colonnes, types et contraintes (`CHECK`, clés primaires et uniques).
* **Performances** : Suppressions en cascade (`ON DELETE CASCADE`), indexation SQLite et transactions par lots (`batch`).
* **CLI** : Initialiser le schéma (`db:init`) et gérer les privilèges (`user:role`).

## 3. [Spécification de l'API REST](./api.md)

* **Conventions** : En-têtes HTTP, authentification JWT et erreurs standardisées (`AppError`).
* **Endpoints** :
  * Authentification et Profil (`/api/auth/*`)
  * Grilles et Duplication (`/api/grids/*`)
  * Élèves, Imports CSV et Promotions (`/api/grids/:gridId/students/*`)
  * Groupes et Équipes (`/api/grids/:gridId/groups/*`)
  * Notes individuelles et collectives (`/api/grids/:gridId/marks/*`)
  * Promotions et Administration (`/api/admin/*`, `/api/promos`)
  * Santé (`/api/health`)

## 4. [Guide de Déploiement et d'Exploitation](./deployment.md)

* **Variables d'environnement** : Secrets et paramètres de configuration.
* **Développement local** : Installation, démarrage avec rechargement automatique et mode hors-ligne.
* **Vercel** : Paramétrage serverless, région `dub1`, routage (`vercel.json`) et synchronisation Turso.
* **Docker** : Déploiement multi-conteneurs Nginx et Express (`docker-compose.yml`).
* **Electron** : Compilation multiplateforme [Windows, macOS, Linux](cite: 2).
