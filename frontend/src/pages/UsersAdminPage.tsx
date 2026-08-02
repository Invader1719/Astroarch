import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"

type ApiUser = {
  id: number
  first_name: string
  last_name: string
  middle_name?: string | null
  nickname: string
  role: string
  lumina: number
}

// "founder" сюда сознательно не входит — назначить фаундера через панель нельзя никому
const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: "guest", label: "Гость" },
  { value: "user", label: "Пользователь" },
  { value: "moderator", label: "Модератор" },
  { value: "admin", label: "Админ" },
]

export default function UsersAdminPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const loadUsers = () => {
    setLoading(true)
    fetch("/api/users/", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`)
        return res.json()
      })
      .then(setUsers)
      .catch((e) => setError(e.message || "Не удалось загрузить пользователей"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [token])

  const changeRole = async (userId: number, role: string) => {
    setSavingId(userId)
    setError(null)
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка: ${res.status}`)
      }
      const updated: ApiUser = await res.json()
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)))
    } catch (e: any) {
      setError(e.message || "Не удалось изменить роль")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 text-white space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Пользователи</h1>
        <p className="text-white/60">
          Все зарегистрированные на сайте, с их уровнем доступа. Роль «Фаундер» назначить здесь нельзя.
        </p>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {loading ? (
        <p className="text-white/60">Загрузка...</p>
      ) : (
        <div className="overflow-x-auto bg-white/10 border border-white/20 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/60">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Никнейм</th>
                <th className="px-4 py-3">Люмина</th>
                <th className="px-4 py-3">Роль</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/10 last:border-0">
                  <td className="px-4 py-3 text-white/70">{u.id}</td>
                  <td className="px-4 py-3">
                    {u.last_name} {u.first_name}{u.middle_name ? ` ${u.middle_name}` : ""}
                  </td>
                  <td className="px-4 py-3 text-white/70">{u.nickname}</td>
                  <td className="px-4 py-3 text-white/70">{u.lumina}</td>
                  <td className="px-4 py-3">
                    {u.role === "founder" ? (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-semibold">
                        Фаундер
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="bg-zinc-900 text-white border border-white/20 rounded px-2 py-1 text-sm disabled:opacity-50"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
