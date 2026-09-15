import { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, Navigate, useLocation } from "react-router-dom";
import GridListPage from "./features/grids/pages/GridListPage.jsx";
import GridCreatePage from "./features/grids/pages/GridCreatePage.jsx";
import GridEditPage from "./features/grids/pages/GridEditPage.jsx";
import GridStudentsPage from "./features/grids/pages/GridStudentsPage.jsx";
import GridEvaluatePage from "./features/grids/pages/GridEvaluatePage.jsx";
import AdminPage from "./features/admin/pages/AdminPage.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import LoginPage from "./auth/LoginPage.jsx";
import Loading from "./components/Loading.jsx";
import Logo from "./components/Logo.jsx";
import Icon from "./components/Icon.jsx";

function initialsOf(user) {
  const source = (user.name || user.email || "").trim();
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function AppShell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // Le tiroir de navigation mobile se referme à chaque changement d'écran ou sur Échap.
  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (loading) {
    return (
      <main className="page page-center">
        <Loading label="Vérification de la session…" />
      </main>
    );
  }

  if (!user) return <LoginPage />;

  const gridsActive = location.pathname === "/" || location.pathname.startsWith("/grilles");
  // Confort d'affichage seulement : l'API admin revérifie le rôle en base à chaque requête.
  const isAdmin = user.role === "admin";

  return (
    <div className="app">
      {/* RGAA 12.7 : premier élément focusable de la page, masqué visuellement sauf au
          focus clavier (voir .skip-link dans global.css). Cible un wrapper (pas <main>
          directement) car chaque page rend déjà son propre <main> — éviter l'imbrication. */}
      <a href="#contenu" className="skip-link">Aller au contenu</a>

      <header className="mobile-bar">
        <Link to="/" className="brand" aria-label="YGrid, accueil">
          <Logo size={28} />
        </Link>
        <button
          type="button"
          className="btn ghost icon-only"
          aria-label={navOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
          aria-expanded={navOpen}
          aria-controls="sidebar"
          onClick={() => setNavOpen((o) => !o)}
        >
          <Icon name={navOpen ? "x" : "menu"} size={18} />
        </button>
      </header>

      <div className={`sidebar-backdrop${navOpen ? " is-open" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

      <aside id="sidebar" className={`sidebar${navOpen ? " is-open" : ""}`}>
        <Link to="/" className="brand sidebar-brand" aria-label="YGrid, accueil">
          <Logo size={32} />
        </Link>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          <p className="sidebar-label">Espace</p>
          <ul>
            <li>
              <NavLink to="/" className={gridsActive ? "nav-item active" : "nav-item"} aria-current={gridsActive ? "page" : undefined}>
                <Icon name="grid" size={18} />
                <span>Mes grilles</span>
              </NavLink>
            </li>
            {isAdmin && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
                  <Icon name="shield" size={18} />
                  <span>Admin</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">{initialsOf(user)}</span>
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user.name || user.email}</span>
            {user.name && user.email && <span className="sidebar-user-mail">{user.email}</span>}
          </div>
          <button type="button" className="btn ghost icon-only" onClick={logout} aria-label="Déconnexion" title="Déconnexion">
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      <div id="contenu" className="app-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<GridListPage />} />
          <Route path="/grilles/nouvelle" element={<GridCreatePage />} />
          <Route path="/grilles/:id/modifier" element={<GridEditPage />} />
          <Route path="/grilles/:id/eleves" element={<GridStudentsPage />} />
          <Route path="/grilles/:id/evaluer" element={<GridEvaluatePage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
