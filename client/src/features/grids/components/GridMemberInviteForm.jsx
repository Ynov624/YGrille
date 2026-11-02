import { useState } from "react";
import Icon from "../../../components/Icon.jsx";

export default function GridMemberInviteForm({ onAddMember, submitting }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    const success = await onAddMember(cleanEmail, role);
    if (success) {
      setEmail("");
      setRole("editor");
    }
  };

  return (
    <form className="share-invite-form" onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Adresse e-mail @ynov.com"
        required
        disabled={submitting}
      />
      <div className="select-wrap">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={submitting}
          aria-label="Rôle du nouveau membre"
        >
          <option value="editor">Éditeur</option>
          <option value="owner">Propriétaire</option>
        </select>
        <Icon name="chevronDown" size={14} className="select-caret" />
      </div>
      <button type="submit" className="btn primary small" disabled={submitting || !email.trim()}>
        <Icon name="userPlus" />
        <span>Ajouter</span>
      </button>
    </form>
  );
}
