import { createContext, useContext, useEffect, useState } from "react"

type User = {
  id: number
  first_name: string
  last_name: string
  middle_name?: string
  nickname: string
  role: string
  lumina: number
}

type AuthContextType = {
  user: User | null
  token: string | null
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"))

  // Загружаем пользователя, если есть токен
  useEffect(() => {
    if (token) {
      fetch("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("Ошибка авторизации")
          return res.json()
        })
        .then(data => setUser(data))
        .catch(() => {
          logout()
        })
    }
  }, [token])

  const login = (newToken: string) => {
    localStorage.setItem("token", newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider")
  }
  return context
}
