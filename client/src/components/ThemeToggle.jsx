import { useTheme } from "../theme/ThemeContext.jsx";
import Icon from "./Icon.jsx";

const THEME_OPTIONS = [
  { id: "light", label: "Thème clair", icon: "sun" },
  { id: "dark", label: "Thème sombre", icon: "moon" },
  { id: "system", label: "Thème du système", icon: "monitor" },
];

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={`theme-toggle ${className}`.trim()}
      role="radiogroup"
      aria-label="Thème d'affichage"
    >
      {THEME_OPTIONS.map((opt) => {
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-toggle-btn${isActive ? " active" : ""}`}
            title={opt.label}
            aria-label={opt.label}
            onClick={() => setTheme(opt.id)}
          >
            <Icon name={opt.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
