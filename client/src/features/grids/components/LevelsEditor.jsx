import { LEVEL_COLORS, LEVEL_DESCRIPTIONS } from "../defaults.js";

/** Édition des 5 niveaux d'acquisition (libellé + barème en %). */
export default function LevelsEditor({ levels, onChange }) {
  const setLevel = (idx, patch) =>
    onChange(levels.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div className="levels-editor">
      {levels.map((l, i) => (
        <div key={i} className="level-row-group" style={{ "--level": LEVEL_COLORS[i] }}>
          <div className="level-row">
            <span className="level-dot" style={{ background: LEVEL_COLORS[i] }}>{i + 1}</span>
            <input
              value={l.label}
              placeholder={`Niveau ${i + 1}`}
              aria-label={`Libellé du niveau ${i + 1}`}
              onChange={(e) => setLevel(i, { label: e.target.value })}
            />
            <label className="pct-input">
              <input
                type="number" min="0" max="100"
                value={l.pct}
                aria-label={`Barème du niveau ${i + 1}, en pourcentage`}
                onChange={(e) => setLevel(i, { pct: e.target.value })}
              />
              <span aria-hidden="true">%</span>
            </label>
            <span className="level-score">→ {((Number(l.pct) || 0) * 0.2).toFixed(1).replace(".", ",")} / 20</span>
          </div>
          <p className="muted small level-description">{LEVEL_DESCRIPTIONS[i]}</p>
        </div>
      ))}
    </div>
  );
}
