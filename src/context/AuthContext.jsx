import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, getStoredToken, setStoredToken } from "../services/api";

const AuthContext = createContext(null);
const THEME_KEY = "ai_research_theme";

function applyThemeClass(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(THEME_KEY, theme);
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUserState(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [logout]);

  useEffect(() => {
    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: fetched } = await api.me();
        setUserState(fetched);
        if (fetched.themePreference) {
          setTheme(fetched.themePreference);
        }
      } catch {
        setStoredToken(null);
        setUserState(null);
      } finally {
        setLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function login(email, password) {
    const res = await api.login({ email, password });
    setStoredToken(res.token);
    setUserState(res.user);
    if (res.user.themePreference) {
      setTheme(res.user.themePreference);
    }
  }

  async function register(name, email, password) {
    const res = await api.register({ name, email, password });
    setStoredToken(res.token);
    setUserState(res.user);
  }

  function setUser(updated) {
    setUserState(updated);
    if (updated.themePreference) {
      setTheme(updated.themePreference);
    }
  }

  async function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (user) {
      try {
        const res = await api.updateProfile({ themePreference: next });
        setUserState(res.user);
      } catch {
        // Keep local theme even if profile sync fails
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        login,
        register,
        logout,
        setUser,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
