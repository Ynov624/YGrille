import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Sans TURSO_DATABASE_URL (dev local), la base est un simple fichier SQLite dans
// server/data/ (non versionné). En production, c'est la base Turso (libsql://…).
const LOCAL_DB_PATH = join(here, "..", "..", "data", "ygrille.db");

let clientPromise = null;

/**
 * Client libSQL créé à la première requête plutôt qu'à l'import : les variables
 * d'environnement sont lues une fois dotenv chargé (ou renseignées par Electron), et le
 * module reste importable sans top-level await.
 *
 * Pour Turso on prend le client « web » (HTTP via fetch, sans binaire natif), adapté aux
 * fonctions serverless de Vercel ; le client Node complet n'est chargé que pour un
 * fichier local.
 */
function getClient() {
  clientPromise ??= createDbClient();
  return clientPromise;
}

async function createDbClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    const { createClient } = await import("@libsql/client/web");
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  mkdirSync(dirname(LOCAL_DB_PATH), { recursive: true });
  const { createClient } = await import("@libsql/client");
  return createClient({ url: `file:${LOCAL_DB_PATH}` });
}

/** Toutes les lignes d'une requête, en objets simples `{ colonne: valeur }`. */
export async function all(sql, args = []) {
  const { rows } = await (await getClient()).execute({ sql, args });
  return rows.map((row) => ({ ...row }));
}

/** Première ligne d'une requête, ou `undefined`. */
export async function get(sql, args = []) {
  const [row] = await all(sql, args);
  return row;
}

/**
 * Écriture simple ; retourne le nombre de lignes touchées. Les services s'en servent pour
 * détecter une ressource introuvable : SQLite compte les lignes trouvées, même quand un
 * UPDATE réécrit des valeurs identiques (pas de faux 404).
 */
export async function run(sql, args = []) {
  const { rowsAffected } = await (await getClient()).execute({ sql, args });
  return rowsAffected;
}

/**
 * Exécute une liste d'écritures `{ sql, args }` dans une seule transaction (tout ou rien)
 * et en un seul aller-retour réseau. Remplace les transactions interactives de MySQL, trop
 * bavardes en HTTP : les UUID étant générés côté serveur, chaque lot est connu d'avance.
 */
export async function batch(statements) {
  if (statements.length === 0) return;
  await (await getClient()).batch(statements, "write");
}

/** Applique le schéma (idempotent : CREATE TABLE IF NOT EXISTS). */
export async function initDatabase() {
  const schema = readFileSync(join(here, "schema.sql"), "utf-8");
  await (await getClient()).executeMultiple(schema);
}
