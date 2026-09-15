import { LEVEL_COLORS } from "../defaults.js";
import Icon from "../../../components/Icon.jsx";

/** 5 cases de niveau cliquables ; `value` est la position sélectionnée (0..4) ou null. */
export default function LevelPicker({ value, onChange, levels, disabled }) {
  return (
    <div className="level-picker">
      {LEVEL_COLORS.map((color, pos) => {
        const label = levels?.[pos]?.label ?? `Niveau ${pos + 1}`;
        const selected = value === pos;
        return (
          <button
            key={pos}
            type="button"
            className={`level-cell${selected ? " selected" : ""}`}
            style={{ "--level": color }}
            title={label}
            aria-label={label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(pos)}
          >
            <span className="level-cell-mark" aria-hidden="true">
              {selected && <Icon name="check" size={12} strokeWidth="3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
