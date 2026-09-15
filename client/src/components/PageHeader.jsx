import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

/**
 * En-tête contextuel commun à tous les écrans : fil d'Ariane, titre, contexte et actions
 * (secondaires à gauche, action principale en dernier pour rester alignée à droite).
 */
export default function PageHeader({ breadcrumbs, title, subtitle, actions }) {
  return (
    <header className="page-header">
      {breadcrumbs?.length > 0 && (
        <nav className="breadcrumbs" aria-label="Fil d'Ariane">
          <ol>
            {breadcrumbs.map((b, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={i}>
                  {b.to && !last ? <Link to={b.to}>{b.label}</Link> : <span aria-current={last ? "page" : undefined}>{b.label}</span>}
                  {!last && <Icon name="chevronRight" size={12} className="breadcrumbs-sep" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {actions && <div className="page-head-actions">{actions}</div>}
      </div>
    </header>
  );
}
