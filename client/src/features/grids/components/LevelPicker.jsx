import { LEVEL_COLORS } from "../defaults.js";

/** 5 pastilles de niveau cliquables ; `value` est la position sélectionnée (0..4) ou null. */
export default function LevelPicker({ value, onChange, levels, disabled }) {
  return (
    <div className="level-picker">
      {LEVEL_COLORS.map((color, pos) => {
        const label = levels?.[pos]?.label ?? `Niveau ${pos + 1}`;
        return (
          <button
            key={pos}
            type="button"
            className={`level-dot-btn${value === pos ? " selected" : ""}`}
            style={{ background: color }}
            title={label}
            aria-label={label}
            aria-pressed={value === pos}
            disabled={disabled}
            onClick={() => onChange(pos)}
          >
            <span aria-hidden="true">{value === pos ? "✓" : ""}</span>
          </button>
        );
      })}
    </div>
  );
}
