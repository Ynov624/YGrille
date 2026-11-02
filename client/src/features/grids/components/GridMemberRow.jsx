import Icon from "../../../components/Icon.jsx";

export default function GridMemberRow({
  member,
  isCurrentUser,
  canManage,
  isSoleOwner,
  loading,
  onChangeRole,
  onRemove,
}) {
  const initials = (member.name || member.email || "?").charAt(0).toUpperCase();

  return (
    <li className="member-row">
      <span className="avatar" aria-hidden="true">
        {initials}
      </span>
      <div className="member-info">
        <span className="member-name">
          {member.name || member.email}
          {isCurrentUser && <span className="member-you"> (vous)</span>}
        </span>
        {member.name && <span className="member-email">{member.email}</span>}
      </div>

      <div className="member-actions">
        {canManage ? (
          <>
            <div className="select-wrap">
              <select
                value={member.role}
                onChange={(e) => onChangeRole(member.id, e.target.value)}
                disabled={loading || isSoleOwner}
                aria-label={`Rôle de ${member.name || member.email}`}
              >
                <option value="owner">Propriétaire</option>
                <option value="editor">Éditeur</option>
              </select>
              <Icon name="chevronDown" size={14} className="select-caret" />
            </div>

            {!isCurrentUser && (
              <button
                type="button"
                className="btn ghost small icon-only text-danger"
                title="Retirer ce membre"
                aria-label={`Retirer ${member.name || member.email}`}
                onClick={() => onRemove(member)}
                disabled={loading || isSoleOwner}
              >
                <Icon name="trash" />
              </button>
            )}
          </>
        ) : (
          <span className={`role-tag ${member.role}`}>
            {member.role === "owner" ? "Propriétaire" : "Éditeur"}
          </span>
        )}
      </div>
    </li>
  );
}
