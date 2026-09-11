-- Schéma complet du projet. Les tables students/marks sont créées dès
-- maintenant mais ne seront exploitées que dans les prochaines itérations.
--
-- Important : InnoDB IGNORE silencieusement une contrainte `REFERENCES` posée
-- au niveau colonne (syntaxe SQL standard, acceptée mais jamais appliquée) —
-- seule une clause `FOREIGN KEY (...) REFERENCES ... (...)` au niveau table
-- crée une vraie contrainte avec CASCADE/SET NULL effectifs. D'où le style
-- ci-dessous (FK déclarées séparément de la colonne, à la fin de chaque
-- CREATE TABLE).

-- Nettoyage ponctuel : l'auth est passée de sessions (cookie + table) à des
-- tokens JWT stateless, cette table n'est plus utilisée. `IF EXISTS` rend le
-- DROP idempotent (no-op après la première exécution).
DROP TABLE IF EXISTS sessions;

-- Auth : email (obligatoirement @ynov.com, cf. utils/authValidate.js) + mot
-- de passe (haché, jamais stocké en clair). Créée avant `grids`, qui la
-- référence.
CREATE TABLE IF NOT EXISTS users (
  id                 VARCHAR(36) PRIMARY KEY,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  name               TEXT NOT NULL DEFAULT (''),
  email_verified_at  DATETIME,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at      DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `email_verified_at` sur les bases déjà déployées avant la vérification par
-- e-mail : contrairement à MariaDB, MySQL ne supporte pas `ADD COLUMN IF NOT
-- EXISTS`, la migration idempotente est donc faite en JS (voir
-- `connection.js`, qui ignore l'erreur ER_DUP_FIELDNAME si la colonne existe déjà).

-- Code de vérification envoyé par e-mail à l'inscription. Un seul code actif
-- par utilisateur : une nouvelle demande (inscription ou renvoi) écrase le
-- précédent (`ON DUPLICATE KEY`, voir services/emailVerification.service.js).
-- Le code n'est jamais stocké en clair, seulement son hash.
CREATE TABLE IF NOT EXISTS email_verification_codes (
  user_id    VARCHAR(36) PRIMARY KEY,
  code_hash  TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grids (
  id         VARCHAR(36) PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL,
  name       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS levels (
  id       VARCHAR(36) PRIMARY KEY,
  grid_id  VARCHAR(36) NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 4),
  label    TEXT NOT NULL,
  pct      DOUBLE NOT NULL CHECK (pct BETWEEN 0 AND 100),
  UNIQUE (grid_id, position),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(36) PRIMARY KEY,
  grid_id     VARCHAR(36) NOT NULL,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  deliverable TEXT NOT NULL DEFAULT (''),
  UNIQUE (grid_id, position),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS criteria (
  id          VARCHAR(36) PRIMARY KEY,
  grid_id     VARCHAR(36) NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  weight      DOUBLE NOT NULL CHECK (weight >= 0),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- `groups` est un mot réservé MySQL depuis la 8.0.2, d'où les backticks.
CREATE TABLE IF NOT EXISTS `groups` (
  id       VARCHAR(36) PRIMARY KEY,
  grid_id  VARCHAR(36) NOT NULL,
  name     TEXT NOT NULL,
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
  id         VARCHAR(36) PRIMARY KEY,
  grid_id    VARCHAR(36) NOT NULL,
  group_id   VARCHAR(36),
  last_name  TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT (''),
  comment    TEXT NOT NULL DEFAULT (''),
  FOREIGN KEY (grid_id) REFERENCES grids(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Promotions gérées depuis le panneau admin (mot de passe partagé, cf.
-- middleware/requireAdmin.js) : un référentiel d'élèves commun à tous les
-- comptes, importable en un clic dans n'importe quelle grille.
CREATE TABLE IF NOT EXISTS promos (
  id         VARCHAR(36) PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promo_students (
  id         VARCHAR(36) PRIMARY KEY,
  promo_id   VARCHAR(36) NOT NULL,
  last_name  TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT (''),
  FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marks (
  student_id     VARCHAR(36) NOT NULL,
  criterion_id   VARCHAR(36) NOT NULL,
  level_position INTEGER NOT NULL CHECK (level_position BETWEEN 0 AND 4),
  comment        TEXT NOT NULL DEFAULT (''),
  PRIMARY KEY (student_id, criterion_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
