// Copie ce fichier en `config.js` (non versionné, contient des secrets) et
// renseigne les vraies valeurs avant de lancer `npm run electron` / `npm run dist`.
//
// TURSO_* : base Turso partagée par toutes les installations desktop. Attention : ce
// fichier est livré en clair dans l'installeur, donc toute personne qui a l'app peut lire
// le token et accéder à toute la base. La version web (Vercel) n'a pas ce problème.
// RESEND_API_KEY/MAIL_FROM : mêmes identifiants que pour la version web, pour que la
// vérification d'e-mail à l'inscription fonctionne aussi depuis l'app.
module.exports = {
  TURSO_DATABASE_URL: "libsql://ygrille-ynov624.aws-eu-west-1.turso.io",
  TURSO_AUTH_TOKEN: "",
  ADMIN_PASSWORD: "",
  RESEND_API_KEY: "",
  MAIL_FROM: "Grilles de notation <onboarding@resend.dev>",
};
