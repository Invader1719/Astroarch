import { useParams, Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import LatexContent from "@/components/LatexContent"
import CopyLatexButton from "@/components/CopyLatexButton"
import { useAuth } from "@/context/AuthContext"

interface Task {
  id: number
  title?: string
  text: string
  solution?: string
  answer?: string
  grade: number
  year: number
  authors?: { id: number; name: string }[]
  source?: {
    name: string
  }
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [showSuggestForm, setShowSuggestForm] = useState(false)
  const [suggestText, setSuggestText] = useState("")
  const [suggestSending, setSuggestSending] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [suggestSent, setSuggestSent] = useState(false)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    fetch(`/api/tasks/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Задача не найдена" : "Ошибка загрузки задачи")
        return res.json()
      })
      .then((data) => setTask(data))
      .catch((e) => setLoadError(e.message || "Ошибка загрузки задачи"))
      .finally(() => setLoading(false))
  }, [id])

  const canEdit = !!user && ["admin", "moderator", "founder"].includes(user.role)
  const imageCaption = task ? (task.title ? `К задаче «${task.title}»` : "К задаче") : undefined

  const handleDelete = async () => {
    if (!task) return
    if (!confirm(`Удалить задачу «${task.title || "без названия"}»? Это необратимо.`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка: ${res.status}`)
      }
      navigate("/tasks")
    } catch (e: any) {
      setDeleteError(e.message || "Не удалось удалить задачу")
      setDeleting(false)
    }
  }

  const handleSuggestSubmit = async () => {
    if (!task || !suggestText.trim()) return
    setSuggestSending(true)
    setSuggestError(null)
    try {
      const res = await fetch(`/api/tasks/${task.id}/suggestions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: suggestText.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Ошибка: ${res.status}`)
      }
      setSuggestText("")
      setShowSuggestForm(false)
      setSuggestSent(true)
    } catch (e: any) {
      setSuggestError(e.message || "Не удалось отправить предложение")
    } finally {
      setSuggestSending(false)
    }
  }

  if (loading) return <div className="text-center text-white mt-10">Загрузка...</div>
  if (loadError || !task) {
    return <div className="text-center text-red-400 mt-10">{loadError || "Задача не найдена"}</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/tasks" className="text-blue-400 hover:underline">← Назад к списку задач</Link>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link
              to={`/task/${task.id}/edit`}
              className="text-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-white/80 transition"
            >
              Редактировать
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {deleting ? "Удаляем..." : "Удалить"}
            </button>
          </div>
        )}
      </div>
      {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}

      <div className="space-y-2">
        {task.title && (
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-300/70">
            {task.title}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Условие задачи</h1>
          <CopyLatexButton text={task.text} />
        </div>
        <LatexContent text={task.text} className="leading-relaxed" imageCaption={imageCaption} />

        {task.source && (
          <p className="text-sm text-white/70">
            Источник: {task.source.name}, {task.year}, {task.grade} класс
          </p>
        )}

        {task.authors && task.authors.length > 0 && (
          <p className="text-sm text-white/70">
            {task.authors.length > 1 ? "Авторы" : "Автор"}: {task.authors.map(a => a.name).join(", ")}
          </p>
        )}
      </div>

      {task.solution && (
        <div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <h2 className="text-xl font-semibold">Решение</h2>
            <CopyLatexButton text={task.solution} />
          </div>
          <LatexContent text={task.solution} className="leading-relaxed" imageCaption={imageCaption} />
        </div>
      )}

      {task.answer && (
        <div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <h2 className="text-xl font-semibold">Ответ</h2>
            <CopyLatexButton text={task.answer} />
          </div>
          <LatexContent text={task.answer} className="leading-relaxed" imageCaption={imageCaption} />
        </div>
      )}

      {user && (
        <div className="border-t border-white/10 pt-4">
          {!showSuggestForm ? (
            <button
              type="button"
              onClick={() => { setShowSuggestForm(true); setSuggestSent(false) }}
              className="text-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-white/80 transition"
            >
              Предложить изменение
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block font-semibold text-white text-sm">
                Что и как поменять
              </label>
              <textarea
                value={suggestText}
                onChange={(e) => setSuggestText(e.target.value)}
                rows={4}
                placeholder="Например: в условии опечатка в третьем абзаце, должно быть «...»"
                className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:border-blue-400"
              />
              {suggestError && <p className="text-red-400 text-sm">{suggestError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSuggestSubmit}
                  disabled={suggestSending || !suggestText.trim()}
                  className="text-sm px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-semibold transition disabled:opacity-50"
                >
                  {suggestSending ? "Отправляем..." : "Отправить"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSuggestForm(false); setSuggestError(null) }}
                  disabled={suggestSending}
                  className="text-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 text-white/80 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
          {suggestSent && (
            <p className="text-green-400 text-sm mt-2">
              Спасибо! Предложение отправлено на рассмотрение — статус можно посмотреть в личном кабинете.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
