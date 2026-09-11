import { Routes, Route, Link } from "react-router-dom";
import GridListPage from "./features/grids/pages/GridListPage.jsx";
import GridCreatePage from "./features/grids/pages/GridCreatePage.jsx";
import GridEditPage from "./features/grids/pages/GridEditPage.jsx";
import GridStudentsPage from "./features/grids/pages/GridStudentsPage.jsx";
import GridEvaluatePage from "./features/grids/pages/GridEvaluatePage.jsx";
import AdminPage from "./features/admin/pages/AdminPage.jsx";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import { AdminProvider } from "./auth/AdminContext.jsx";
import LoginPage from "./auth/LoginPage.jsx";
import Loading from "./components/Loading.jsx";

function AppShell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <Loading label="Vérification de la session…" />
      </main>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <>
      {/* RGAA 12.7 : premier élément focusable de la page, masqué visuellement sauf au
          focus clavier (voir .skip-link dans global.css). Cible un wrapper (pas <main>
          directement) car chaque page rend déjà son propre <main> — éviter l'imbrication. */}
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">Y</span>
          YGrid
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/admin" className="btn ghost small">Admin</Link>
          <span className="muted small">{user.name || user.email}</span>
          <button type="button" className="btn ghost small" onClick={logout}>Déconnexion</button>
        </div>
      </header>
      <div id="contenu" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<GridListPage />} />
          <Route path="/grilles/nouvelle" element={<GridCreatePage />} />
          <Route path="/grilles/:id/modifier" element={<GridEditPage />} />
          <Route path="/grilles/:id/eleves" element={<GridStudentsPage />} />
          <Route path="/grilles/:id/evaluer" element={<GridEvaluatePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <AppShell />
      </AdminProvider>
    </AuthProvider>
  );
}
