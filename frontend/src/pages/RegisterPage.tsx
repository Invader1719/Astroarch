import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName || null,
          nickname,
          password
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Ошибка регистрации")
      }

      alert("Регистрация успешна! Теперь войдите в аккаунт.")
      navigate("/login")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Регистрация</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Имя</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Фамилия</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Отчество (необязательно)</label>
          <input
            type="text"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

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
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>
      </form>
    </div>
  )
}
