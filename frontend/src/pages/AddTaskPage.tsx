import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"

type Source = { id: number; name: string }
type Topic = { id: number; name: string }
type Subtopic = { id: number; name: string; topic_id: number }

export default function AddTaskPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  const [text, setText] = useState("")
  const [solution, setSolution] = useState("")
  const [answer, setAnswer] = useState("")
  const [difficulty, setDifficulty] = useState(1)
  const [sourceId, setSourceId] = useState<number | null>(null)
  const [topicIds, setTopicIds] = useState<number[]>([])
  const [subtopicIds, setSubtopicIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔹 Проверка роли
  useEffect(() => {
    if (!user || !["admin", "moderator"].includes(user.role)) {
      navigate("/") // редирект, если нет прав
    }
  }, [user, navigate])

  const [sources, setSources] = useState([])
  const [topics, setTopics] = useState([])
  const [subtopics, setSubtopics] = useState([])

  // 🔹 Подгрузка списков
  useEffect(() => {
    fetch("/sources").then(r => r.json()).then(setSources).catch(console.error)
    fetch("/topics").then(r => r.json()).then(setTopics).catch(console.error)
    fetch("/subtopics").then(r => r.json()).then(setSubtopics).catch(console.error)
  }, [])


  const toggleArrayValue = <T,>(value: T, arr: T[], setter: (val: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/tasks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          solution,
          answer,
          difficulty,
          source_id: sourceId,
          topic_ids: topicIds,
          subtopic_ids: subtopicIds
        })
      })

      if (!res.ok) {
        const rawText = await res.text()
        let errorText = "Ошибка добавления задачи"

        try {
          const parsed = JSON.parse(rawText)
          if (parsed.detail) errorText = parsed.detail
          else errorText = rawText
        } catch {
          errorText = rawText
        }

        throw new Error(errorText)
      }



      alert("Задача успешно добавлена!")
      navigate("/tasks")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Добавить задачу</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Условие */}
        <div>
          <label className="block mb-1">Условие</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        {/* Решение */}
        <div>
          <label className="block mb-1">Решение (необязательно)</label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Ответ */}
        <div>
          <label className="block mb-1">Ответ (необязательно)</label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        {/* Сложность */}
        <div>
          <label className="block mb-1">Сложность</label>
          <input
            type="number"
            min={1}
            max={5}
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
          />
        </div>

        {/* Источник */}
        <div>
          <label className="block mb-1">Источник</label>
          <select
            value={sourceId ?? ""}
            onChange={(e) => setSourceId(Number(e.target.value))}
            className="w-full bg-zinc-900 text-white border border-white/20 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
            required
          >
            <option value="">Выберите источник</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Темы */}
        <div>
          <label className="block mb-1">Темы</label>
          {topics.map(t => (
            <label key={t.id} className="block">
              <input
                type="checkbox"
                checked={topicIds.includes(t.id)}
                onChange={() => toggleArrayValue(t.id, topicIds, setTopicIds)}
              />{" "}
              {t.name}
            </label>
          ))}
        </div>

        {/* Подтемы */}
        <div>
          <label className="block mb-1">Подтемы</label>
          {subtopics
            .filter(st => topicIds.includes(st.topic_id))
            .map(st => (
              <label key={st.id} className="block">
                <input
                  type="checkbox"
                  checked={subtopicIds.includes(st.id)}
                  onChange={() => toggleArrayValue(st.id, subtopicIds, setSubtopicIds)}
                />{" "}
                {st.name}
              </label>
            ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          {loading ? "Добавляем..." : "Добавить задачу"}
        </button>
      </form>
    </div>
  )
}
