-- Schéma complet (SQLite, hébergé sur Turso). Chaque instruction est idempotente :
-- appliqué par `npm run db:init -w server`, et au démarrage du serveur local
-- (src/index.js).
--
-- Les clés étrangères sont appliquées, sur Turso comme sur le fichier local
-- (@libsql/client les active par défaut) : les suppressions en cascade ci-dessous
-- sont effectives et les services comptent dessus (supprimer une grille supprime
-- ses niveaux, critères, élèves et notes).
--
-- COLLATE NOCASE sur les noms triés à l'affichage : SQLite compare par défaut octet
-- par octet (« dupont » serait rangé après « DURAND »). Les lettres accentuées restent
-- rangées après les lettres simples.

-- Auth : email (obligatoirement @ynov.com, normalisé en minuscules, cf.
-- auth/authValidate.js) + mot de passe (haché, jamais stocké en clair).
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  name               TEXT NOT NULL DEFAULT '',
  email_verified_at  DATETIME,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at      DATETIME
);

-- Code de vérification envoyé par e-mail à l'inscription. Un seul code actif
-- par utilisateur : une nouvelle demande (inscription ou renvoi) écrase le
-- précédent (`ON CONFLICT`, voir services/emailVerification.service.js).
-- Le code n'est jamais stocké en clair, seulement son hash.
CREATE TABLE IF NOT EXISTS email_verification_codes (
  user_id    TEXT PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grids (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS levels (
  id       TEXT PRIMARY KEY,
  grid_id  TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 4),
  label    TEXT NOT NULL,
  pct      REAL NOT NULL CHECK (pct BETWEEN 0 AND 100),
  UNIQUE (grid_id, position),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  grid_id     TEXT NOT NULL,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  deliverable TEXT NOT NULL DEFAULT '',
  UNIQUE (grid_id, position),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS criteria (
  id          TEXT PRIMARY KEY,
  grid_id     TEXT NOT NULL,
  category_id TEXT NOT NULL,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  weight      REAL NOT NULL CHECK (weight >= 0),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- `groups` est un mot-clé SQL (fonctions de fenêtrage), d'où les guillemets obliques.
CREATE TABLE IF NOT EXISTS `groups` (
  id       TEXT PRIMARY KEY,
  grid_id  TEXT NOT NULL,
  name     TEXT NOT NULL COLLATE NOCASE,
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id         TEXT PRIMARY KEY,
  grid_id    TEXT NOT NULL,
  group_id   TEXT,
  last_name  TEXT NOT NULL COLLATE NOCASE,
  first_name TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  comment    TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL
);

-- Promotions gérées depuis le panneau admin (mot de passe partagé, cf.
-- middleware/requireAdmin.js) : un référentiel d'élèves commun à tous les
-- comptes, importable en un clic dans n'importe quelle grille.
CREATE TABLE IF NOT EXISTS promos (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_students (
  id         TEXT PRIMARY KEY,
  promo_id   TEXT NOT NULL,
  last_name  TEXT NOT NULL COLLATE NOCASE,
  first_name TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marks (
  student_id     TEXT NOT NULL,
  criterion_id   TEXT NOT NULL,
  level_position INTEGER NOT NULL CHECK (level_position BETWEEN 0 AND 4),
  comment        TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (student_id, criterion_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE
);

-- Contrairement à InnoDB, SQLite n'indexe pas automatiquement les clés étrangères :
-- sans ces index, chaque lecture « par grille » et chaque suppression en cascade
-- parcourt toute la table. (levels/categories sont couverts par leur UNIQUE, marks
-- par sa clé primaire pour student_id.)
CREATE INDEX IF NOT EXISTS idx_grids_user ON grids(user_id);
CREATE INDEX IF NOT EXISTS idx_criteria_grid ON criteria(grid_id);
CREATE INDEX IF NOT EXISTS idx_criteria_category ON criteria(category_id);
CREATE INDEX IF NOT EXISTS idx_groups_grid ON `groups`(grid_id);
CREATE INDEX IF NOT EXISTS idx_students_grid ON students(grid_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_promo_students_promo ON promo_students(promo_id);
CREATE INDEX IF NOT EXISTS idx_marks_criterion ON marks(criterion_id);
