import Icon from "../../../components/Icon.jsx";

/**
 * Badge visuel indiquant qu'un champ ou critère est actuellement verrouillé par un collaborateur.
 */
export default function LockIndicator({ userName, className = "" }) {
  const label = userName ? `Modifié par ${userName}` : "Verrouillé";

  return (
    <output className={`lock-pill ${className}`.trim()} aria-label={label} title={label}>
      <Icon name="lock" size={12} />
      <span>{label}</span>
    </output>
  );
}
