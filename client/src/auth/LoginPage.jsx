import { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const MODE_TITLES = { login: "Connexion", register: "Créer un compte", verify: "Vérifier l'e-mail" };

export default function LoginPage() {
  const { login, register, verifyEmail, resendCode } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register" | "verify"
  useDocumentTitle(MODE_TITLES[mode]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors(null);
    setInfo(null);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register(email, password, name);
        setMode("verify");
        setInfo(`Un code de vérification a été envoyé à ${email}.`);
      } else {
        await verifyEmail(email, code);
      }
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify");
        setInfo("Ton compte n'est pas encore vérifié. Un nouveau code a été envoyé.");
        resendCode(email).catch(() => {});
      } else {
        setErrors(err.details?.length ? err.details : [err.message]);
      }
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  const cancelVerify = () => {
    setMode("login");
    setCode("");
    setErrors(null);
    setInfo(null);
  };

  const handleResend = async () => {
    setErrors(null);
    setInfo(null);
    try {
      await resendCode(email);
      setInfo(`Un nouveau code a été envoyé à ${email}.`);
    } catch (err) {
      setErrors(err.details?.length ? err.details : [err.message]);
    }
  };

  return (
    <main className="page" style={{ maxWidth: 420 }}>
      <div className="page-head">
        <div>
          <h1>
            {mode === "login" && "Connexion"}
            {mode === "register" && "Créer un compte"}
            {mode === "verify" && "Vérifier l'e-mail"}
          </h1>
          <p className="sub">
            {mode === "verify" ? "Saisis le code reçu par e-mail." : "Utilisez votre adresse @ynov.com."}
          </p>
        </div>
      </div>

      <form onSubmit={submit}>
        <section className="panel">
          {mode === "register" && (
            <label className="field" style={{ marginBottom: 14 }}>
              <span>Nom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom" autoComplete="name" />
            </label>
          )}

          {mode !== "verify" && (
            <label className="field" style={{ marginBottom: 14 }}>
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@ynov.com"
                autoComplete="email"
                autoFocus
                required
              />
            </label>
          )}

          {mode !== "verify" && (
            <label className="field">
              <span>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                minLength={mode === "register" ? 12 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              {mode === "register" && (
                <small className="hint">
                  12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.
                </small>
              )}
            </label>
          )}

          {mode === "verify" && (
            <label className="field">
              <span>Code reçu par e-mail</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
              />
            </label>
          )}
        </section>

        {info && <div className="info-box" role="status">{info}</div>}
        {errors && (
          <div className="error-box" role="alert">
            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}

        <button type="submit" className="btn primary" disabled={saving}>
          {saving
            ? "Patiente…"
            : mode === "login"
            ? "Se connecter"
            : mode === "register"
            ? "Créer le compte"
            : "Valider le code"}
        </button>

        {mode === "verify" ? (
          <>
            <button type="button" className="btn ghost" style={{ marginLeft: 10 }} onClick={handleResend}>
              Renvoyer le code
            </button>
            <button type="button" className="btn ghost" style={{ marginLeft: 10 }} onClick={cancelVerify}>
              Annuler
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn ghost"
            style={{ marginLeft: 10 }}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setErrors(null);
              setInfo(null);
            }}
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        )}
      </form>
    </main>
  );
}
