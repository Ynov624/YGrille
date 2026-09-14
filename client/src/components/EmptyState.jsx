/** État vide éditorial : trame géométrique discrète, titre, explication courte, une action. */
export default function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <svg className="empty-art" width="96" height="72" viewBox="0 0 96 72" aria-hidden="true" focusable="false">
        {[0, 1, 2, 3].map((col) =>
          [0, 1, 2].map((row) => (
            <rect
              key={`${col}-${row}`}
              className={col === 1 && row === 1 ? "empty-art-cell is-accent" : "empty-art-cell"}
              x={2 + col * 24}
              y={2 + row * 24}
              width="20"
              height="20"
              rx="3"
            />
          ))
        )}
      </svg>
      <h2>{title}</h2>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}
