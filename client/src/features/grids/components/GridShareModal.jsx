import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../auth/AuthContext.jsx";
import Icon from "../../../components/Icon.jsx";
import Loading from "../../../components/Loading.jsx";
import { useGridMembers } from "../hooks/useGridMembers.js";
import GridMemberInviteForm from "./GridMemberInviteForm.jsx";
import GridMemberRow from "./GridMemberRow.jsx";

export default function GridShareModal({
  gridId,
  gridName,
  isOpen,
  onClose,
  currentUserRole,
  onLeftGrid,
  onMembersUpdated,
}) {
  const dialogRef = useRef(null);
  const { user } = useAuth();
  const {
    members,
    loading,
    error,
    submitting,
    actionLoadingId,
    addMember,
    changeRole,
    removeMember,
    leave,
    reset,
  } = useGridMembers(gridId, isOpen, onMembersUpdated);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Synchronisation avec l'élément <dialog> HTML5 natif
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fermeture au clic sur le backdrop natif
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      if (e.target === dialog) {
        handleClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [handleClose]);

  const memberList = members ?? [];
  const currentMember = memberList.find((m) => m.id === user?.id);
  const isOwner = (currentMember?.role || currentUserRole) === "owner";
  const ownerCount = memberList.filter((m) => m.role === "owner").length;

  const handleRemove = (member) => {
    if (window.confirm(`Retirer ${member.name || member.email} de la grille ?`)) {
      removeMember(member.id);
    }
  };

  const handleLeave = async () => {
    const msg =
      "Êtes-vous sûr de vouloir quitter cette grille ? Vous n'aurez plus accès à ses évaluations.";
    if (!window.confirm(msg)) return;

    const success = await leave();
    if (success) {
      handleClose();
      onLeftGrid?.();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="share-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        handleClose();
      }}
    >
      <div className="modal-header">
        <h2 id="share-modal-title" className="modal-title">
          Partager la grille {gridName ? `« ${gridName} »` : ""}
        </h2>
        <button
          type="button"
          className="btn ghost small icon-only"
          aria-label="Fermer la boîte de dialogue"
          onClick={handleClose}
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="modal-body">
        {error && (
          <div className="error-box" role="alert">
            <Icon name="alert" />
            <div>
              <p>{error.message}</p>
              {Array.isArray(error.details) && error.details.length > 0 && (
                <ul>
                  {error.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {isOwner && <GridMemberInviteForm onAddMember={addMember} submitting={submitting} />}

        {loading ? (
          <Loading label="Chargement des collaborateurs…" />
        ) : (
          <div className="share-members-section">
            <span className="field-label">Collaborateurs ({memberList.length})</span>
            <ul className="member-list">
              {memberList.map((m) => (
                <GridMemberRow
                  key={m.id}
                  member={m}
                  isCurrentUser={m.id === user?.id}
                  canManage={isOwner}
                  isSoleOwner={m.role === "owner" && ownerCount <= 1}
                  loading={actionLoadingId === m.id}
                  onChangeRole={changeRole}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="modal-footer">
        {!isOwner && (
          <button
            type="button"
            className="btn danger small"
            onClick={handleLeave}
            disabled={submitting}
          >
            Quitter la grille
          </button>
        )}
        <button type="button" className="btn ghost small" onClick={handleClose}>
          Fermer
        </button>
      </div>
    </dialog>
  );
}
