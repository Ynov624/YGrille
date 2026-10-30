import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as authApi from "../api/auth.js";
import { setAuthToken } from "../api/client.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "ygrid_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setAuthToken(token);
    void authApi
      .fetchMe()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, [clearSession]);

  const storeSession = useCallback(({ token, user: authUser }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(authUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      storeSession(await authApi.login(email, password));
    },
    [storeSession]
  );

  // Ne stocke pas de session : l'inscription ne renvoie plus de token tant que
  // l'e-mail n'est pas vérifié (voir verifyEmail ci-dessous).
  const register = useCallback(
    (email, password, name) => authApi.register(email, password, name),
    []
  );

  const verifyEmail = useCallback(
    async (email, code) => {
      storeSession(await authApi.verifyEmail(email, code));
    },
    [storeSession]
  );

  const resendCode = useCallback((email) => authApi.resendCode(email), []);

  const logout = useCallback(() => {
    clearSession();
    authApi.logout().catch(() => {});
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, loading, login, register, verifyEmail, resendCode, logout }),
    [user, loading, login, register, verifyEmail, resendCode, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un <AuthProvider>.");
  return ctx;
}
