import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { all, get, run } from "../db/connection.js";
import { badRequest, notFound } from "../utils/errors.js";

const SALT_ROUNDS = 10;
const ADMIN_LIST_FIELDS = "id, email, name, role, email_verified_at, created_at, last_login_at";

export async function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]);
}

export async function findUserById(id) {
  return get("SELECT * FROM users WHERE id = ?", [id]);
}

export function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function registerUser({ email, password, name }) {
  if (await findUserByEmail(email)) {
    throw badRequest("Inscription invalide.", ["Un compte existe déjà avec cette adresse e-mail."]);
  }
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  await run(
    "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
    [id, email, passwordHash, name]
  );
  return toPublicUser({ id, email, name });
}

export async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return null;
  }
  if (!user.email_verified_at) {
    throw badRequest(
      "Compte non vérifié.",
      ["Vérifie ton adresse e-mail avant de te connecter."],
      "EMAIL_NOT_VERIFIED"
    );
  }
  await run("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  return toPublicUser(user);
}

/** Tous les comptes, pour la gestion des rôles dans le panneau admin. */
export async function listUsers() {
  return all(`SELECT ${ADMIN_LIST_FIELDS} FROM users ORDER BY email`);
}

export async function setUserRole(id, role) {
  const affectedRows = await run("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  if (affectedRows === 0) throw notFound("Utilisateur introuvable.");
  return get(`SELECT ${ADMIN_LIST_FIELDS} FROM users WHERE id = ?`, [id]);
}
