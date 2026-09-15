import * as users from "../services/users.service.js";
import {
  validateRegisterPayload,
  validateLoginPayload,
  validateVerifyEmailPayload,
  validateResendCodePayload,
} from "../auth/authValidate.js";
import { badRequest } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken, getTokenFromHeader, verifyToken } from "../auth/jwt.js";
import { issueVerificationCode, verifyCode } from "../services/emailVerification.service.js";

export const register = asyncHandler(async (req, res) => {
  const payload = validateRegisterPayload(req.body);
  const user = await users.registerUser(payload);
  await issueVerificationCode(user.id, user.email);
  res.status(201).json({ pendingVerification: true, email: user.email });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = validateVerifyEmailPayload(req.body);
  const user = await users.findUserByEmail(email);
  if (!user) {
    throw badRequest("Vérification invalide.", ["Aucun compte pour cette adresse e-mail."]);
  }
  await verifyCode(user.id, code);
  const publicUser = users.toPublicUser(user);
  res.json({ token: signToken(publicUser), user: publicUser });
});

export const resendCode = asyncHandler(async (req, res) => {
  const { email } = validateResendCodePayload(req.body);
  const user = await users.findUserByEmail(email);
  // Réponse identique que le compte existe ou non, pour ne pas révéler
  // quelles adresses sont enregistrées.
  if (user && !user.email_verified_at) {
    await issueVerificationCode(user.id, user.email);
  }
  res.status(202).json({ ok: true });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateLoginPayload(req.body);
  const user = await users.verifyCredentials(email, password);
  if (!user) {
    throw badRequest("Connexion invalide.", ["E-mail ou mot de passe incorrect."]);
  }
  res.json({ token: signToken(user), user });
});

export const logout = asyncHandler(async (_req, res) => {
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  const payload = verifyToken(getTokenFromHeader(req));
  // Relu en base plutôt que tiré du token : le rôle a pu changer depuis la connexion (il
  // n'est d'ailleurs pas dans le token), et le compte avoir été supprimé.
  const user = payload && (await users.findUserById(payload.id));
  if (!user) {
    return res.status(401).json({ error: "Non authentifié." });
  }
  res.json(users.toPublicUser(user));
});
