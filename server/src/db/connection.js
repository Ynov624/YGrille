import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "grilles",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
  // Sans CLIENT_FOUND_ROWS, `affectedRows` sur un UPDATE ne compte que les lignes
  // dont une valeur a réellement changé. Le code des services teste `affectedRows`
  // pour détecter une ressource introuvable (comme `changes` en SQLite, qui compte
  // les lignes matchées) : un UPDATE qui réécrit les mêmes valeurs déclencherait
  // sinon un faux 404.
  flags: ["FOUND_ROWS"],
});

async function waitForDatabase(retries = 20, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`[db] connexion MySQL indisponible (essai ${attempt}/${retries}), nouvelle tentative dans ${delayMs}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/** Attend que MySQL soit prêt puis applique le schéma (idempotent : CREATE TABLE IF NOT EXISTS). */
export async function initDatabase() {
  await waitForDatabase();
  const schema = readFileSync(join(here, "schema.sql"), "utf-8");
  await pool.query(schema);
  await addColumnIfMissing("users", "email_verified_at", "DATETIME");
}

// MySQL (contrairement à MariaDB) n'a pas de `ADD COLUMN IF NOT EXISTS` :
// on tente l'ALTER et on ignore l'erreur si la colonne existe déjà
// (ER_DUP_FIELDNAME, ex. sur une base déployée avant cette migration).
async function addColumnIfMissing(table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}
