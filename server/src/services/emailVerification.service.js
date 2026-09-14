import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { get, run, batch } from "../db/connection.js";
import { badRequest } from "../utils/errors.js";
import { sendVerificationCodeEmail } from "./mail.service.js";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SALT_ROUNDS = 10;

function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Génère un nouveau code, remplace celui en cours pour cet utilisateur et l'envoie par e-mail. */
export async function issueVerificationCode(userId, email) {
  const code = generateCode();
  const codeHash = bcrypt.hashSync(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await run(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at, attempts)
     VALUES (?, ?, ?, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
    [userId, codeHash, expiresAt]
  );

  try {
    await sendVerificationCodeEmail(email, code);
  } catch (err) {
    if (process.env.NODE_ENV === "production") throw err;
    console.warn(`[dev] Envoi de l'e-mail impossible (${err.message}) — code pour ${email} : ${code}`);
  }
}

/** Vérifie le code fourni pour un utilisateur ; marque le compte comme vérifié si correct. */
export async function verifyCode(userId, code) {
  const row = await get("SELECT * FROM email_verification_codes WHERE user_id = ?", [userId]);

  if (!row) {
    throw badRequest("Vérification invalide.", ["Aucun code en attente pour ce compte. Demande un nouveau code."]);
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw badRequest("Vérification invalide.", ["Trop de tentatives. Demande un nouveau code."]);
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw badRequest("Vérification invalide.", ["Ce code a expiré. Demande un nouveau code."]);
  }
  if (!bcrypt.compareSync(code, row.code_hash)) {
    await run("UPDATE email_verification_codes SET attempts = attempts + 1 WHERE user_id = ?", [userId]);
    throw badRequest("Vérification invalide.", ["Code incorrect."]);
  }

  await batch([
    { sql: "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?", args: [userId] },
    { sql: "DELETE FROM email_verification_codes WHERE user_id = ?", args: [userId] },
  ]);
}
