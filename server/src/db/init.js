// Applique le schéma sur la base configurée (TURSO_DATABASE_URL, sinon le fichier local).
// À lancer une fois après la création de la base, puis après chaque modification de
// schema.sql : `npm run db:init -w server`. Les fonctions Vercel ne le font pas elles-mêmes
// pour ne pas rejouer le schéma à chaque démarrage à froid.
import "dotenv/config";
import { initDatabase } from "./connection.js";

await initDatabase();
console.log(`[db] schéma appliqué sur ${process.env.TURSO_DATABASE_URL || "la base locale (server/data/ygrille.db)"}`);
