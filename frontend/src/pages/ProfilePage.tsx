import { useAuth } from "@/context/AuthContext"
import { useNavigate, Link } from "react-router-dom"
import { useEffect, useState } from "react"

type Suggestion = {
  id: number
  task_id: number
  text: string
  status: "pending" | "accepted" | "rejected"
  admin_comment?: string | null
  created_at: string
  reviewed_at?: string | null
  task?: { id: number; title?: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: "На рассмотрении",
  accepted: "Принято",
  rejected: "Отклонено",
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  accepted: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
}

export default function ProfilePage() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate("/login")
    }
  }, [user, navigate])

  useEffect(() => {
    if (!token) return
    fetch("/api/suggestions/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then(setSuggestions)
      .catch(console.error)
      .finally(() => setLoadingSuggestions(false))
  }, [token])

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto mt-10 mb-10 p-6 bg-white/10 border border-white/20 rounded-lg backdrop-blur-md text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Личный кабинет</h1>
        <p><strong>ФИО:</strong> {user.last_name} {user.first_name} {user.middle_name ?? ""}</p>
        <p><strong>Никнейм:</strong> {user.nickname}</p>
        <p><strong>Роль:</strong> {user.role}</p>
        <p><strong>Люмины:</strong> {user.lumina}</p>

        <button
          onClick={() => {
            logout()
            navigate("/")
          }}
          className="mt-6 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Выйти из аккаунта
        </button>
      </div>

      <div className="border-t border-white/10 pt-4">
        <h2 className="text-lg font-semibold mb-3">Мои предложения</h2>
        {loadingSuggestions ? (
          <p className="text-white/60 text-sm">Загрузка...</p>
        ) : suggestions.length === 0 ? (
          <p className="text-white/60 text-sm">Вы ещё не предлагали изменений к задачам.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-black/20 border border-white/10 rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/task/${s.task_id}`} className="text-blue-400 hover:underline text-sm font-semibold">
                    {s.task?.title || `Задача №${s.task_id}`}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{s.text}</p>
                {s.admin_comment && (
                  <p className="text-xs text-white/50">Ответ: {s.admin_comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
