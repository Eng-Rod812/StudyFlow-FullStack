import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, storage, tokenExpiry } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Sesión: el token vive en localStorage, se valida su caducidad y se cierra sola al vencer o ante un 401.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = storage.getToken();
    const exp = token ? tokenExpiry(token) : null;
    if (!token || (exp && exp < Date.now())) { storage.clear(); return null; }
    return storage.getUser();
  });
  const [notice, setNotice] = useState("");

  const logout = useCallback((message = "") => { storage.clear(); setUser(null); setNotice(message); }, []);

  const authenticate = useCallback(async (path, payload) => {
    const data = await api(path, { method: "POST", body: payload });
    storage.save(data.token, data.user);
    setUser(data.user);
    setNotice("");
  }, []);

  // Cierre automático al caducar el JWT o si el servidor responde 401.
  useEffect(() => {
    const onUnauthorized = () => logout("Tu sesión terminó. Inicia sesión de nuevo.");
    window.addEventListener("studyflow:unauthorized", onUnauthorized);
    const exp = storage.getToken() ? tokenExpiry(storage.getToken()) : null;
    const timer = exp ? setTimeout(onUnauthorized, Math.max(0, Math.min(exp - Date.now(), 2 ** 31 - 1))) : null;
    return () => { window.removeEventListener("studyflow:unauthorized", onUnauthorized); if (timer) clearTimeout(timer); };
  }, [user, logout]);

  // Refresca el rol real desde el servidor (por si un admin lo cambió).
  useEffect(() => {
    if (!user) return;
    api("/auth/me").then(({ user: fresh }) => {
      if (fresh.role !== user.role || fresh.name !== user.name) { storage.save(storage.getToken(), fresh); setUser(fresh); }
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({
    user, notice, isAdmin: user?.role === "admin",
    login: (p) => authenticate("/auth/login", p),
    register: (p) => authenticate("/auth/register", p),
    logout,
  }), [user, notice, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
