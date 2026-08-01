import { useParams, Link } from "react-router-dom"
import { useEffect, useState } from "react"
import LatexContent from "@/components/LatexContent"
import CopyLatexButton from "@/components/CopyLatexButton"

interface Task {
  id: number
  text: string
  solution?: string
  answer?: string
  grade?: number
  author?: { id: number; name: string } | null
  source?: {
    name: string
    year?: number
    round?: string
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
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Условие задачи</h1>
          <CopyLatexButton text={task.text} />
        </div>
        <LatexContent text={task.text} className="leading-relaxed" />

        {task.source && (
          <p className="text-sm text-white/70">
            Источник: {task.source.name}
            {task.source.round ? `, ${task.source.round}` : ""}
            {task.source.year ? `, ${task.source.year}` : ""}
            {task.grade ? `, ${task.grade} класс` : ""}
          </p>
        )}

        {task.author && (
          <p className="text-sm text-white/70">
            Автор: {task.author.name}
          </p>
        )}
      </div>

      {task.solution && (
        <div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <h2 className="text-xl font-semibold">Решение</h2>
            <CopyLatexButton text={task.solution} />
          </div>
          <LatexContent text={task.solution} className="leading-relaxed" />
        </div>
      )}

      {task.answer && (
        <div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <h2 className="text-xl font-semibold">Ответ</h2>
            <CopyLatexButton text={task.answer} />
          </div>
          <LatexContent text={task.answer} className="leading-relaxed" />
        </div>
      )}
    </div>
  )
}
