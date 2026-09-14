import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";

/**
 * Menu déroulant (bouton « ⋯ ») : regroupe des actions secondaires pour éviter d'aligner
 * trop de boutons. Le popover est rendu dans un portail (document.body) et positionné en
 * coordonnées écran (`position: fixed`) plutôt que nichée dans la carte : sinon, dans une
 * liste de cartes en flexbox, une carte voisine peut repasser par-dessus le popover malgré
 * son z-index (contexte d'empilement propre à chaque carte).
 */
export default function Menu({ label = "Actions", children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.type === "mousedown") {
        const target = e.target;
        if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn ghost small icon-only menu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="more" size={18} />
      </button>
      {open && pos && createPortal(
        <div
          ref={popoverRef}
          className="menu-popover"
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
