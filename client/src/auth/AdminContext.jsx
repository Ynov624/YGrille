import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminLogin } from "../api/admin.js";
import { setAdminToken } from "../api/client.js";

const AdminContext = createContext(null);
// sessionStorage (pas localStorage) : l'élévation admin ne doit pas survivre à la
// fermeture de l'onglet, contrairement à la session utilisateur normale.
const TOKEN_KEY = "ygrid_admin_token";

export function AdminProvider({ children }) {
  const [unlocked, setUnlocked] = useState(() => Boolean(sessionStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    setAdminToken(sessionStorage.getItem(TOKEN_KEY));
  }, []);

  const unlock = useCallback(async (password) => {
    const { token } = await adminLogin(password);
    sessionStorage.setItem(TOKEN_KEY, token);
    setAdminToken(token);
    setUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAdminToken(null);
    setUnlocked(false);
  }, []);

  return (
    <AdminContext.Provider value={{ unlocked, unlock, lock }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin doit être utilisé dans un <AdminProvider>.");
  return ctx;
}
