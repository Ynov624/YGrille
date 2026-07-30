import { Resend } from "resend";

let client = null;

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant. Définis-le dans server/.env (voir server/.env.example).");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

/** Envoie le code de vérification à l'inscription (ou lors d'un renvoi). */
export async function sendVerificationCodeEmail(to, code) {
  const from = process.env.MAIL_FROM || "Grilles de notation <onboarding@resend.dev>";
  // Le SDK Resend ne lève pas d'exception sur une erreur HTTP (clé invalide,
  // domaine non vérifié, quota...) : il faut vérifier `error` explicitement,
  // sinon l'inscription répondrait « succès » sans qu'aucun mail ne parte.
  const { error } = await getClient().emails.send({
    from,
    to,
    subject: `${code} - Code de vérification`,
    // Styles en ligne uniquement : la plupart des clients mail (Gmail en tête)
    // ignorent les balises <style>. Palette reprise de client/src/styles/global.css
    // (thème sombre de l'appli) pour que le mail ressemble à l'interface.
    html: `
      <body style="margin:0; padding:32px 16px; background:#14161C; font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
        <div style="max-width:420px; margin:0 auto; background:#1D2029; border:1px solid #323644; border-radius:14px; padding:32px 28px; color:#F1F1F4;">
          <p style="margin:0 0 4px; font-size:13px; font-weight:650; letter-spacing:.04em; text-transform:uppercase; color:#6C8CE8;">
            Grilles de notation
          </p>
          <h1 style="margin:0 0 20px; font-size:19px; font-weight:650; color:#F1F1F4;">
            Vérifie ton adresse e-mail
          </h1>
          <p style="margin:0 0 20px; font-size:14.5px; line-height:1.5; color:#A2A6B3;">
            Voici ton code de vérification pour activer ton compte :
          </p>
          <div style="background:rgba(108,140,232,.16); border:1px solid rgba(108,140,232,.30); border-radius:9px; padding:16px; text-align:center; margin:0 0 20px;">
            <span style="font-size:30px; font-weight:700; letter-spacing:8px; color:#F1F1F4;">${code}</span>
          </div>
          <p style="margin:0; font-size:13px; line-height:1.5; color:#A2A6B3;">
            Ce code expire dans 15 minutes. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.
          </p>
        </div>
      </body>
    `,
  });
  if (error) {
    throw new Error(`Échec de l'envoi de l'e-mail de vérification (Resend) : ${error.message}`);
  }
}
