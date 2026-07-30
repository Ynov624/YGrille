// Copie ce fichier en `config.js` (non versionné, contient des secrets) et
// renseigne les vraies valeurs avant de lancer `npm run electron` / `npm run dist`.
//
// DB_* : identifiants du MySQL hébergé partagé par toutes les installations
// desktop (ex. un add-on Clever Cloud). RESEND_API_KEY/MAIL_FROM : mêmes
// identifiants que pour la version web (server/.env), pour que la
// vérification d'e-mail à l'inscription fonctionne aussi depuis l'app.
module.exports = {
  DB_HOST: "",
  DB_PORT: "3306",
  DB_USER: "",
  DB_PASSWORD: "",
  DB_NAME: "",
  RESEND_API_KEY: "",
  MAIL_FROM: "Grilles de notation <noreply@mail.kilianmoun.com>",
};
