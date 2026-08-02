import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"

type Suggestion = {
  id: number
  task_id: number
  text: string
  status: "pending" | "accepted" | "rejected"
  admin_comment?: string | null
  created_at: string
  reviewed_at?: string | null
  task?: { id: number; title?: string | null; text: string } | null
  user?: { id: number; first_name: string; last_name: string; nickname: string } | null
  reviewed_by?: { id: number; first_name: string; last_name: string; nickname: string } | null
}

type Filter = "pending" | "accepted" | "rejected" | "all"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "На рассмотрении" },
  { value: "accepted", label: "Принятые" },
  { value: "rejected", label: "Отклонённые" },
  { value: "all", label: "Все" },
]

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

export default function SuggestionsPage() {
  const { token } = useAuth()
  const [filter, setFilter] = useState<Filter>("pending")
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    const params = filter === "all" ? "" : `?status=${filter}`
    fetch(`/api/suggestions/${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`)
        return res.json()
      })
      .then(setItems)
      .catch((e) => setError(e.message || "Не удалось загрузить предложения"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter, token])

  const review = async (id: number, status: "accepted" | "rejected") => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, admin_comment: comments[id]?.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка: ${res.status}`)
      }
      const updated: Suggestion = await res.json()
      setItems((prev) =>
        filter === "all" ? prev.map((s) => (s.id === id ? updated : s)) : prev.filter((s) => s.id !== id)
      )
    } catch (e: any) {
      setError(e.message || "Не удалось обработать предложение")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-white space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Предложения</h1>
        <p className="text-white/60">Изменения к задачам, предложенные пользователями.</p>
      </div>

      <div className="flex items-center gap-1 bg-zinc-900 border border-white/20 rounded-full p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filter === f.value ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <p className="text-white/60">Загрузка...</p>
      ) : items.length === 0 ? (
        <p className="text-white/60">Здесь пока пусто.</p>
      ) : (
        <div className="space-y-4">
          {items.map((s) => (
            <div key={s.id} className="bg-white/10 border border-white/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/task/${s.task_id}`} className="text-blue-400 hover:underline font-semibold">
                    {s.task?.title || `Задача №${s.task_id}`}
                  </Link>
                  <p className="text-xs text-white/50">
                    {s.user ? `${s.user.last_name} ${s.user.first_name} (${s.user.nickname})` : "неизвестный пользователь"}
                    {" · "}
                    {new Date(s.created_at).toLocaleString("ru-RU")}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOR[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>

              <p className="text-white/90 whitespace-pre-wrap">{s.text}</p>

              {s.status === "pending" ? (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <textarea
                    value={comments[s.id] ?? ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Комментарий (необязательно)"
                    rows={2}
                    className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => review(s.id, "accepted")}
                      disabled={busyId === s.id}
                      className="text-sm px-3 py-1.5 rounded-full bg-green-500 hover:bg-green-400 text-white font-semibold transition disabled:opacity-50"
                    >
                      ✓ Принять
                    </button>
                    <button
                      type="button"
                      onClick={() => review(s.id, "rejected")}
                      disabled={busyId === s.id}
                      className="text-sm px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold transition disabled:opacity-50"
                    >
                      ✕ Отклонить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 text-sm text-white/60 space-y-1">
                  {s.admin_comment && <p>Комментарий: {s.admin_comment}</p>}
                  <p>
                    {s.reviewed_by ? `${s.reviewed_by.last_name} ${s.reviewed_by.first_name}` : "—"}
                    {s.reviewed_at ? ` · ${new Date(s.reviewed_at).toLocaleString("ru-RU")}` : ""}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
