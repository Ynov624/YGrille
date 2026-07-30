import { LEVEL_COLORS } from "../defaults.js";

/** 5 pastilles de niveau cliquables ; `value` est la position sélectionnée (0..4) ou null. */
export default function LevelPicker({ value, onChange, levels, disabled }) {
  return (
    <div className="level-picker">
      {LEVEL_COLORS.map((color, pos) => (
        <button
          key={pos}
          type="button"
          className={`level-dot-btn${value === pos ? " selected" : ""}`}
          style={{ background: color }}
          title={levels?.[pos]?.label ?? `Niveau ${pos + 1}`}
          disabled={disabled}
          onClick={() => onChange(pos)}
        >
          {value === pos ? "✓" : ""}
        </button>
      ))}
    </div>
  );
}
