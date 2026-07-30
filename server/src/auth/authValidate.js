import { badRequest } from "../utils/errors.js";

const ALLOWED_EMAIL_DOMAIN = "ynov.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recommandation CNIL (mot de passe seul, sans mesure complémentaire type
// verrouillage de compte) : 12 caractères minimum mêlant majuscules,
// minuscules, chiffres et caractères spéciaux.
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_LOWER_RE = /[a-z]/;
const PASSWORD_UPPER_RE = /[A-Z]/;
const PASSWORD_DIGIT_RE = /[0-9]/;
const PASSWORD_SPECIAL_RE = /[^A-Za-z0-9]/;

/** Valide un mot de passe selon la norme CNIL et retourne les erreurs éventuelles. */
function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`);
  }
  if (!PASSWORD_LOWER_RE.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule.");
  }
  if (!PASSWORD_UPPER_RE.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule.");
  }
  if (!PASSWORD_DIGIT_RE.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre.");
  }
  if (!PASSWORD_SPECIAL_RE.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial.");
  }
  return errors;
}

/** Valide et normalise le payload d'inscription : { email, password, name? }. */
export function validateRegisterPayload(body) {
  const errors = [];

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!EMAIL_RE.test(email)) {
    errors.push("Adresse e-mail invalide.");
  } else if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    errors.push(`Seules les adresses @${ALLOWED_EMAIL_DOMAIN} sont autorisées.`);
  }
  errors.push(...validatePasswordStrength(password));

  if (errors.length > 0) throw badRequest("Inscription invalide.", errors);
  return { email, password, name };
}

/** Valide le payload de connexion : { email, password }. */
export function validateLoginPayload(body) {
  const errors = [];

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email) errors.push("L'adresse e-mail est obligatoire.");
  if (!password) errors.push("Le mot de passe est obligatoire.");

  if (errors.length > 0) throw badRequest("Connexion invalide.", errors);
  return { email, password };
}

const CODE_RE = /^\d{6}$/;

/** Valide le payload de vérification d'e-mail : { email, code }. */
export function validateVerifyEmailPayload(body) {
  const errors = [];

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!email) errors.push("L'adresse e-mail est obligatoire.");
  if (!CODE_RE.test(code)) errors.push("Le code doit contenir 6 chiffres.");

  if (errors.length > 0) throw badRequest("Vérification invalide.", errors);
  return { email, code };
}

/** Valide le payload de renvoi de code : { email }. */
export function validateResendCodePayload(body) {
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) throw badRequest("Renvoi invalide.", ["L'adresse e-mail est obligatoire."]);
  return { email };
}
