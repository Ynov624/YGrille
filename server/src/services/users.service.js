import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../db/connection.js";
import { badRequest } from "../utils/errors.js";

const SALT_ROUNDS = 10;

export async function findUserByEmail(email) {
  const [[user]] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return user;
}

export function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

export async function registerUser({ email, password, name }) {
  if (await findUserByEmail(email)) {
    throw badRequest("Inscription invalide.", ["Un compte existe déjà avec cette adresse e-mail."]);
  }
  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  await pool.query(
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
  await pool.query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  return toPublicUser(user);
}
