import { useRef, useState } from "react";

/**
 * Appréciation d'un critère, avec gestion du verrou de saisie et rollback en cas de conflit.
 */
export default function CriterionComment({
  entry,
  onSetComment,
  onFocusLock,
  onBlurLock,
  disabled = false,
}) {
  const storedComment = entry?.comment ?? "";
  const [commentDraft, setCommentDraft] = useState(storedComment);
  const [prevStored, setPrevStored] = useState(storedComment);
  const acquiredRef = useRef(false);

  if (prevStored !== storedComment) {
    setPrevStored(storedComment);
    setCommentDraft(storedComment);
  }

  const handleFocus = async (e) => {
    if (disabled) return;
    if (onFocusLock) {
      const ok = await onFocusLock();
      if (ok === false) {
        setCommentDraft(storedComment);
        acquiredRef.current = false;
        e.target.blur();
        return;
      }
      acquiredRef.current = true;
    }
  };

  const handleBlur = () => {
    if (!acquiredRef.current && onFocusLock) return;
    acquiredRef.current = false;
    if (commentDraft !== storedComment) {
      onSetComment(commentDraft);
    }
    if (onBlurLock) {
      onBlurLock();
    }
  };

  return (
    <input
      className="eval-crit-comment"
      type="text"
      placeholder="Appréciation du critère…"
      value={commentDraft}
      disabled={disabled}
      onChange={(e) => setCommentDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
