// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  nickname: string;
  role: string;   // "admin" | "moderator" | "founder" | ...
  lumina: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState<boolean>(true);

  // загрузка профиля, если уже есть токен (перезагрузка страницы и т.п.)
  useEffect(() => {
    let abort = new AbortController();
    async function bootstrap() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal,
          credentials: "omit",
        });
        if (!res.ok) throw new Error("unauthorized");
        const me: User = await res.json();
        setUser(me);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
    return () => abort.abort();
  }, [token]);

  // ⚠️ главное изменение: сразу после login забираем /auth/me и выставляем user
  const login = async (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    try {
      const res = await fetch(`/api/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
        credentials: "omit",
      });
      if (!res.ok) throw new Error("unauthorized");
      const me: User = await res.json();
      setUser(me);
    } catch {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      throw new Error("Ошибка авторизации");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {/* пока идёт bootstrap можно показать лоадер/ничего */}
      {loading ? null : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
