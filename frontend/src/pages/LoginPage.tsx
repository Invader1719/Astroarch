import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext" // ✅ подключаем контекст

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth() // ✅ берём функцию login из контекста

  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Ошибка входа")
      }

      const data = await res.json()

      // ✅ Сохраняем токен в контекст (и в localStorage внутри него)
      login(data.access_token)

      navigate("/profile", { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Вход</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Никнейм</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  )
}
