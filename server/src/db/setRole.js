// Attribue un rôle à un compte existant depuis la ligne de commande : sert surtout à nommer
// le premier administrateur, les suivants pouvant l'être depuis le panneau admin.
//   npm run user:role -w server -- prenom.nom@ynov.com admin
// Cible la même base que db:init (TURSO_DATABASE_URL, sinon le fichier local) et applique
// d'abord le schéma, pour que la colonne `role` existe.
import "dotenv/config";
import { initDatabase, run } from "./connection.js";
import { ROLES } from "../utils/validate.js";

const [email, role] = process.argv.slice(2);
if (!email || !ROLES.includes(role)) {
  console.error(`Usage : npm run user:role -w server -- <email> <${ROLES.join("|")}>`);
  process.exit(1);
}

const target = process.env.TURSO_DATABASE_URL || "la base locale (server/data/ygrille.db)";
await initDatabase();
const updated = await run("UPDATE users SET role = ? WHERE email = ?", [role, email.trim().toLowerCase()]);
if (updated === 0) {
  console.error(`[db] aucun compte ${email} sur ${target} : la personne doit d'abord s'inscrire.`);
  process.exit(1);
}
console.log(`[db] ${email} a maintenant le rôle « ${role} » sur ${target}`);
