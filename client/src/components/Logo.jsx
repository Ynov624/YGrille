/**
 * Identité YGrid (logo fourni, public/logo.png).
 * - variant « full » : pictogramme + wordmark + « by Ynov Campus » ; « mark » : pictogramme seul.
 * - tone « light » : wordmark clair, pour les surfaces sombres.
 */
export function LogoMark({ size = 32, className = "" }) {
  return (
    <img
      className={`logo-mark ${className}`.trim()}
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      decoding="async"
    />
  );
}

export default function Logo({ variant = "full", tone = "auto", size = 32, className = "" }) {
  if (variant === "mark") return <LogoMark size={size} className={className} />;
  return (
    <span className={`logo logo-${tone} ${className}`.trim()}>
      <LogoMark size={size} />
      <span className="logo-text">
        <span className="logo-wordmark">YGrid</span>
        <span className="logo-descriptor">by Ynov Campus</span>
      </span>
    </span>
  );
}
