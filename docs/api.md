# Spécification de l'API REST

Ce document décrit les endpoints de l'API YGrille, les formats, les règles de validation et la gestion des erreurs.

## 1. Conventions Générales

- **Préfixe des routes** : `/api`

- **Format des données** : JSON (`Content-Type: application/json; charset=utf-8`)

- **Authentification** : L'API requiert l'en-tête HTTP standard :

```http
Authorization: Bearer <votre_jeton_jwt>
```

(Sauf pour les routes publiques `/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-email`, `/api/auth/resend-code`).

### Format standard des erreurs

Les erreurs applicatives renvoient un code HTTP (4xx ou 5xx) et un corps JSON standardisé :

```json
{
  "error": "Description claire de l'erreur.",
  "details": [
    "Détail ou règle de validation non respectée 1",
    "Détail ou règle de validation non respectée 2"
  ],
  "code": "OPTIONNEL_CODE_ERREUR"
}
```

## 2. Authentification (`/api/auth`)

### 2.1. Inscription

`POST /api/auth/register` _(Public)_

Valide les informations, crée le compte (`user`) et envoie un code par e-mail.

- **Règles de validation** :
- `email` : Termine obligatoirement par `@ynov.com`.

- `password` : Conforme CNIL (12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial).

- `name` : Optionnel.

- **Corps de la requête** :

```json
{
  "email": "jean.dupont@ynov.com",
  "password": "Password123!@#",
  "name": "Jean Dupont"
}
```

- **Réponse (201 Created)** :

```json
{
  "pendingVerification": true,
  "email": "jean.dupont@ynov.com"
}
```

### 2.2. Validation du code e-mail

`POST /api/auth/verify-email` _(Public)_

Vérifie le code et active le compte.

- **Corps de la requête** :

```json
{
  "email": "jean.dupont@ynov.com",
  "code": "481029"
}
```

- **Réponse (200 OK)** :

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "c1f7a0b3-4f9e-4e89-a29d-7dbbc9e4c19a",
    "email": "jean.dupont@ynov.com",
    "name": "Jean Dupont",
    "role": "user"
  }
}
```

### 2.3. Renvoi d'un code de vérification

`POST /api/auth/resend-code` _(Public)_

Génère un nouveau code et écrase l'ancien. La réponse renvoie 202 pour masquer l'existence du compte.

- **Corps de la requête** :

```json
{
  "email": "jean.dupont@ynov.com"
}
```

- **Réponse (202 Accepted)** :

```json
{
  "ok": true
}
```

### 2.4. Connexion

`POST /api/auth/login` _(Public)_

- **Corps de la requête** :

```json
{
  "email": "jean.dupont@ynov.com",
  "password": "Password123!@#"
}
```

- **Réponse (200 OK)** :

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "c1f7a0b3-4f9e-4e89-a29d-7dbbc9e4c19a",
    "email": "jean.dupont@ynov.com",
    "name": "Jean Dupont",
    "role": "user"
  }
}
```

### 2.5. Profil utilisateur courant

`GET /api/auth/me` _(Authentifié)_

Renvoie les données de l'utilisateur. Le serveur relit le rôle en base.

- **Réponse (200 OK)** :

```json
{
  "id": "c1f7a0b3-4f9e-4e89-a29d-7dbbc9e4c19a",
  "email": "jean.dupont@ynov.com",
  "name": "Jean Dupont",
  "role": "admin"
}
```

## 3. Grilles d'évaluation (`/api/grids`)

L'API isole les opérations par utilisateur (`user_id`). Un utilisateur gère uniquement ses propres grilles.

### 3.1. Liste des grilles

`GET /api/grids`

- **Réponse (200 OK)** :

```json
[
  {
    "id": "848da050-cf17-488b-a3d5-e2db2ef47e44",
    "name": "Soutenance Projets Web B3",
    "created_at": "2026-03-15 14:00:00",
    "criteria_count": 8,
    "students_count": 24
  }
]
```

### 3.2. Détail complet d'une grille

`GET /api/grids/:id`

Renvoie la grille complète avec niveaux, catégories et critères.

- **Réponse (200 OK)** :

```json
{
  "id": "848da050-cf17-488b-a3d5-e2db2ef47e44",
  "name": "Soutenance Projets Web B3",
  "created_at": "2026-03-15 14:00:00",
  "levels": [
    { "id": "uuid-1", "position": 0, "label": "Non acquis", "pct": 0 },
    { "id": "uuid-2", "position": 1, "label": "En cours", "pct": 25 },
    { "id": "uuid-3", "position": 2, "label": "Acquis", "pct": 50 },
    { "id": "uuid-4", "position": 3, "label": "Maîtrisé", "pct": 75 },
    { "id": "uuid-5", "position": 4, "label": "Dépassé", "pct": 100 }
  ],
  "categories": [
    { "id": "cat-1", "position": 0, "name": "Qualité du code", "deliverable": "Dépôt GitHub" }
  ],
  "criteria": [
    {
      "id": "crit-1",
      "category_id": "cat-1",
      "position": 0,
      "name": "Architecture et modularité",
      "weight": 5
    }
  ]
}
```

### 3.3. Création d'une grille

`POST /api/grids`

Crée la grille, ses niveaux, catégories et critères dans une transaction atomique.

- **Corps de la requête** :

```json
{
  "name": "TP Node.js & Express",
  "levels": [
    { "label": "Non acquis", "pct": 0 },
    { "label": "En cours", "pct": 25 },
    { "label": "Acquis", "pct": 50 },
    { "label": "Maîtrisé", "pct": 75 },
    { "label": "Dépassé", "pct": 100 }
  ],
  "categories": [
    { "name": "Code", "deliverable": "GitHub" },
    { "name": "Oral", "deliverable": "Présentation" }
  ],
  "criteria": [
    { "name": "Respect des conventions", "weight": 4, "categoryIndex": 0 },
    { "name": "Clarté du discours", "weight": 6, "categoryIndex": 1 }
  ]
}
```

- **Réponse (201 Created)** : Détail complet de la grille créée.

### 3.4. Modification d'une grille

`PUT /api/grids/:id`

Remplace la grille complète de manière atomique.

- **Réponse (200 OK)** : Grille mise à jour.

### 3.5. Duplication d'une grille

`POST /api/grids/:id/duplicate`

Duplique la structure d'une grille. L'API ignore les étudiants et les notes.

- **Réponse (201 Created)** : Grille dupliquée.

### 3.6. Suppression d'une grille

`DELETE /api/grids/:id`

Supprime la grille. La base supprime les éléments rattachés en cascade. Seul le propriétaire (`owner`) peut supprimer la grille.

- **Réponse (204 No Content)**.

### 3.7. Liste des membres d'une grille

`GET /api/grids/:id/members`

Renvoie la liste des collaborateurs ayant accès à la grille ainsi que leur rôle (`owner` ou `editor`).

- **Réponse (200 OK)** :

```json
[
  {
    "grid_id": "grd-1",
    "user_id": "usr-1",
    "email": "jean.dupont@ynov.com",
    "name": "Jean Dupont",
    "role": "owner",
    "created_at": "2026-11-01T10:00:00.000Z"
  },
  {
    "grid_id": "grd-1",
    "user_id": "usr-2",
    "email": "marie.curie@ynov.com",
    "name": "Marie Curie",
    "role": "editor",
    "created_at": "2026-11-02T14:30:00.000Z"
  }
]
```

### 3.8. Invitation d'un collaborateur

`POST /api/grids/:id/members` _(Rôle Owner)_

Invite un enseignant existant à collaborer sur la grille.

- **Corps de la requête** :

```json
{
  "email": "marie.curie@ynov.com",
  "role": "editor"
}
```

- **Réponse (201 Created)** : Liste mise à jour des collaborateurs de la grille (`Member[]`).

```json
[
  {
    "id": "c1f7a0b3-4f9e-4e89-a29d-7dbbc9e4c19a",
    "email": "jean.dupont@ynov.com",
    "name": "Jean Dupont",
    "role": "owner",
    "created_at": "2026-11-03T10:00:00Z"
  },
  {
    "id": "d2e8b1c4-5a0f-5f90-b30e-8eccd0f5d20b",
    "email": "marie.curie@ynov.com",
    "name": "Marie Curie",
    "role": "editor",
    "created_at": "2026-11-03T11:30:00Z"
  }
]
```

### 3.9. Modification du rôle d'un collaborateur

`PATCH /api/grids/:id/members/:userId` _(Rôle Owner)_

Modifie le rôle d'un collaborateur (`owner` ou `editor`).

- **Corps de la requête** :

```json
{
  "role": "owner"
}
```

- **Réponse (200 OK)** : Liste mise à jour des collaborateurs de la grille (`Member[]`).

```json
[
  {
    "id": "c1f7a0b3-4f9e-4e89-a29d-7dbbc9e4c19a",
    "email": "jean.dupont@ynov.com",
    "name": "Jean Dupont",
    "role": "owner",
    "created_at": "2026-11-03T10:00:00Z"
  },
  {
    "id": "d2e8b1c4-5a0f-5f90-b30e-8eccd0f5d20b",
    "email": "marie.curie@ynov.com",
    "name": "Marie Curie",
    "role": "owner",
    "created_at": "2026-11-03T11:30:00Z"
  }
]
```

### 3.10. Retrait d'un collaborateur

`DELETE /api/grids/:id/members/:userId` _(Rôle Owner)_

Retire l'accès d'un collaborateur à la grille.

- **Réponse (204 No Content)**.

### 3.11. Quitter une grille partagée

`POST /api/grids/:id/leave` _(Rôle Editor uniquement)_

Permet à un éditeur de renoncer volontairement à son accès sur une grille.

- **Réponse (204 No Content)**.

## 4. Gestion des Élèves (`/api/grids/:gridId/students`)

### 4.1. Liste des élèves d'une grille

`GET /api/grids/:gridId/students`

- **Réponse (200 OK)** :

```json
[
  {
    "id": "stu-1",
    "last_name": "Dupont",
    "first_name": "Alice",
    "comment": "Très bon investissement.",
    "group_id": "grp-1"
  }
]
```

### 4.2. Ajout individuel d'un élève

`POST /api/grids/:gridId/students`

- **Corps de la requête** :

```json
{
  "lastName": "Martin",
  "firstName": "Lucas"
}
```

- **Réponse (201 Created)** : Objet élève créé.

### 4.3. Import en masse (CSV)

`POST /api/grids/:gridId/students/import`

- **Corps de la requête** :

```json
{
  "csv": "Nom;Prénom\nDurand;Sophie\nPetit;Thomas"
}
```

- **Réponse (201 Created)** : Liste complète des élèves de la grille après import.

### 4.4. Import depuis une promotion

`POST /api/grids/:gridId/students/import-promo`

- **Corps de la requête** :

```json
{
  "promoId": "promo-uuid"
}
```

- **Réponse (201 Created)** : Liste complète des élèves.

### 4.5. Mise à jour d'un élève

`PATCH /api/grids/:gridId/students/:id`

- **Corps de la requête** :

```json
{
  "lastName": "Martin",
  "firstName": "Lucas",
  "comment": "Bonne participation orale."
}
```

- **Réponse (200 OK)** : Objet élève mis à jour.

### 4.6. Assignation d'un groupe

`PUT /api/grids/:gridId/students/:id/group`

- **Corps de la requête** :

```json
{
  "groupId": "grp-1"
}
```

(Passez `groupId: null` pour retirer l'élève d'un groupe).

- **Réponse (200 OK)** : Objet élève mis à jour.

### 4.7. Suppression d'un élève

`DELETE /api/grids/:gridId/students/:id`

- **Réponse (204 No Content)**.

## 5. Groupes (`/api/grids/:gridId/groups`)

### 5.1. Liste des groupes

`GET /api/grids/:gridId/groups`

- **Réponse (200 OK)** :

```json
[{ "id": "grp-1", "grid_id": "grid-1", "name": "Groupe A" }]
```

### 5.2. Création d'un groupe

`POST /api/grids/:gridId/groups`

- **Corps de la requête** :

```json
{ "name": "Groupe A" }
```

- **Réponse (201 Created)** : Objet groupe créé.

### 5.3. Suppression d'un groupe

`DELETE /api/grids/:gridId/groups/:id`

- Dissout le groupe. Le `group_id` des élèves devient `NULL`.

- **Réponse (204 No Content)**.

### 5.4. Saisie d'une appréciation générale pour un groupe

`PUT /api/grids/:gridId/groups/:id/comment`

Applique atomiquement une appréciation textuelle à l'ensemble des élèves rattachés au groupe. L'opération vérifie les verrous actifs sur chaque élève (`eval:student:ID:general`).

- **Corps de la requête** :

```json
{
  "comment": "Très bonne cohésion et travail d'équipe remarquable."
}
```

- **Réponse (200 OK)** :

```json
{
  "groupId": "grp-1",
  "affectedCount": 3,
  "comment": "Très bonne cohésion et travail d'équipe remarquable."
}
```

## 6. Saisie des Notes (`/api/grids/:gridId/marks`)

### 6.1. Récupération des notes d'une grille

`GET /api/grids/:gridId/marks`

- **Réponse (200 OK)** :

```json
[
  {
    "student_id": "stu-1",
    "criterion_id": "crit-1",
    "level_position": 3,
    "comment": "Excellente rigueur sur le typage."
  }
]
```

### 6.2. Évaluation individuelle d'un critère

`PUT /api/grids/:gridId/marks/:studentId/:criterionId`

Enregistre ou modifie l'évaluation d'un critère. L'API vérifie le verrou actif (`eval:student:studentId:crit:criterionId`) et conserve les paramètres non fournis.

- **Corps de la requête** :

```json
{
  "levelPosition": 3,
  "comment": "Très bonne démonstration."
}
```

- **Réponse (200 OK)** :

```json
{
  "studentId": "stu-1",
  "criterionId": "crit-1",
  "levelPosition": 3,
  "comment": "Très bonne démonstration."
}
```

### 6.3. Évaluation par groupe d'un critère

`PUT /api/grids/:gridId/marks/group/:groupId/:criterionId`

Applique un niveau d'acquisition ou une appréciation à tous les membres d'un groupe via une transaction batch atomique. L'opération vérifie au préalable les verrous de l'ensemble des membres du groupe.

- **Corps de la requête** :

```json
{
  "levelPosition": 2,
  "comment": "Architecture propre mais manque de tests unitaires."
}
```

- **Réponse (200 OK)** :

```json
{
  "groupId": "grp-1",
  "criterionId": "crit-1",
  "levelPosition": 2,
  "comment": "Architecture propre mais manque de tests unitaires.",
  "studentIds": ["stu-1", "stu-2", "stu-3"]
}
```

## 7. Verrouillage Concurrent & Baux Temps Réel (`/api/grids/:id/locks`)

Pour éviter les écrasements simultanés lors d'évaluations multi-enseignants, l'API fournit des baux temporaires avec expiration automatique (TTL de 90 secondes).

### 7.1. Liste des verrous actifs

`GET /api/grids/:id/locks`

Renvoie tous les verrous actifs non expirés de la grille.

- **Réponse (200 OK)** :

```json
[
  {
    "lock_key": "eval:student:stu-1:crit:crit-1",
    "user_id": "usr-2",
    "user_name": "Marie Curie",
    "expires_at": 1730650000000
  }
]
```

### 7.2. Acquisition ou renouvellement de verrous

`POST /api/grids/:id/locks`

Tente d'acquérir ou renouveler atomiquement un ensemble de clés de verrouillage (maximum 50 clés, longueur max 128 caractères). L'acquisition de `grid:structure` est strictement réservée au rôle `owner` (lève `403 Forbidden` pour un éditeur).

- **Corps de la requête** :

```json
{
  "keys": ["eval:student:stu-1:crit:crit-1", "eval:student:stu-1:general"]
}
```

- **Réponse en cas de succès (200 OK)** :

```json
{
  "acquired": true,
  "expiresAt": 1730650090000
}
```

- **Réponse en cas de conflit (200 OK)** :

```json
{
  "acquired": false,
  "lockedBy": "Marie Curie",
  "expiresAt": 1730650085000
}
```

> Si une écriture (`PUT /marks/...`, `PUT /groups/.../comment`, `PUT /grids/:id`) tente de modifier un champ actif verrouillé par un tiers, l'API rejette l'opération avec `423 Locked` en fournissant les métadonnées de collision :
>
> ```json
> {
>   "error": "Ce champ est actuellement verrouillé par Marie Curie.",
>   "details": [
>     {
>       "lockKey": "eval:student:stu-1:crit:crit-1",
>       "userName": "Marie Curie"
>     }
>   ]
> }
> ```

### 7.3. Libération en lot de verrous

`POST /api/grids/:id/locks/release`

Libère explicitement les baux détenus par l'utilisateur courant.

- **Corps de la requête** :

```json
{
  "keys": ["eval:student:stu-1:crit:crit-1"]
}
```

- **Réponse (204 No Content)**.

### 7.4. Libération unitaire d'un verrou

`DELETE /api/grids/:id/locks/:lockKey`

Libère un verrou individuel détenu par l'utilisateur courant.

- **Réponse (204 No Content)**.

## 8. Promotions et Administration

### 8.1. Promotions publiques

`GET /api/promos` _(Authentifié)_

Renvoie les promotions disponibles.

- **Réponse (200 OK)** :

```json
[
  {
    "id": "promo-1",
    "name": "B3 Dev 2026",
    "created_at": "2026-01-10 10:00:00",
    "students_count": 32
  }
]
```

### 8.2. Gestion des promotions (`/api/admin/promos`) _(Rôle Admin)_

- `GET /api/admin/promos` : Liste complète des promos.

- `POST /api/admin/promos` : Créer une promotion (`{ "name": "M1 Cyber 2026" }`).

- `GET /api/admin/promos/:id` : Détail avec liste de tous les élèves.

- `PATCH /api/admin/promos/:id` : Renommer une promotion.

- `DELETE /api/admin/promos/:id` : Supprimer une promotion et ses élèves.

- `POST /api/admin/promos/:id/students` : Ajouter un élève (`{ "lastName": "...", "firstName": "..." }`).

- `POST /api/admin/promos/:id/students/import` : Import CSV d'élèves dans la promo (`{ "csv": "..." }`).

- `PATCH /api/admin/promos/:id/students/:studentId` : Modifier un élève de promo.

- `DELETE /api/admin/promos/:id/students/:studentId` : Retirer un élève de promo.

### 8.3. Gestion des rôles utilisateurs (`/api/admin/users`) _(Rôle Admin)_

- `GET /api/admin/users` : Liste des comptes inscrits.

- `PATCH /api/admin/users/:id` : Mise à jour du rôle (`{ "role": "admin" }` ou `{ "role": "user" }`).

## 9. Supervision et Santé (`/api/health`)

`GET /api/health` _(Public)_

Vérifie le fonctionnement du serveur HTTP ou des sondes de disponibilité.

- **Réponse (200 OK)** :

```json
{ "ok": true }
```
