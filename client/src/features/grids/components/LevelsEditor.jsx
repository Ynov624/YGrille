import { LEVEL_COLORS } from "../defaults.js";

/** Édition des 5 niveaux d'acquisition (libellé + barème en %). */
export default function LevelsEditor({ levels, onChange }) {
  const setLevel = (idx, patch) =>
    onChange(levels.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div className="levels-editor">
      {levels.map((l, i) => (
        <div key={i} className="level-row">
          <span className="level-dot" style={{ background: LEVEL_COLORS[i] }}>{i + 1}</span>
          <input
            value={l.label}
            placeholder={`Niveau ${i + 1}`}
            onChange={(e) => setLevel(i, { label: e.target.value })}
          />
          <label className="pct-input">
            <input
              type="number" min="0" max="100"
              value={l.pct}
              onChange={(e) => setLevel(i, { pct: e.target.value })}
            />
            <span>%</span>
          </label>
          <span className="muted small">→ {((Number(l.pct) || 0) * 0.2).toFixed(1).replace(".", ",")} / 20</span>
        </div>
      ))}
    </div>
  );
}
