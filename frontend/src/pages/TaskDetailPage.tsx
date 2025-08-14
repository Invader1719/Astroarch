import { useParams, Link } from "react-router-dom"
import { useEffect, useState } from "react"

interface Task {
  id: number
  text: string
  solution?: string
  answer?: string
  author?: string
  source?: {
    name: string
    year?: number
    grade?: number
  }
}

export default function TaskDetailPage() {
  const { id } = useParams()
  const [task, setTask] = useState<Task | null>(null)

  useEffect(() => {
    fetch(`/api/tasks/${id}`)
      .then((res) => res.json())
      .then((data) => setTask(data))
      .catch(console.error)
  }, [id])

  if (!task) return <div className="text-center text-white mt-10">Загрузка...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 text-white space-y-6">
      <Link to="/" className="text-blue-400 hover:underline">← Назад к списку задач</Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Условие задачи</h1>
        <p className="whitespace-pre-line">{task.text}</p>

        {task.source && (
          <p className="text-sm text-white/70">
            Источник: {task.source.name}
            {task.source.year ? `, ${task.source.year}` : ""}
            {task.source.grade ? `, ${task.source.grade} класс` : ""}
          </p>
        )}

        {task.author && (
          <p className="text-sm text-white/70">
            Автор: {task.author}
          </p>
        )}
      </div>

      {task.solution && (
        <div>
          <h2 className="text-xl font-semibold mt-4">Решение</h2>
          <p className="whitespace-pre-line">{task.solution}</p>
        </div>
      )}

      {task.answer && (
        <div>
          <h2 className="text-xl font-semibold mt-4">Ответ</h2>
          <p className="whitespace-pre-line">{task.answer}</p>
        </div>
      )}
    </div>
  )
}
