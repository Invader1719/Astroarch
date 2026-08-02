import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"

type Topic = { id: number; name: string }
type Author = { id: number; name: string }
type Source = { id: number; name: string }

export default function AdminPanel() {
  const { token } = useAuth()
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const [topics, setTopics] = useState<Topic[]>([])
  const [topicName, setTopicName] = useState("")
  const [subtopicName, setSubtopicName] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [authorName, setAuthorName] = useState("")

  const [sources, setSources] = useState<Source[]>([])
  const [sourceName, setSourceName] = useState("")

  // Загружаем список тем и источников при старте
  useEffect(() => {
    fetch("/api/topics/")
      .then(res => res.json())
      .then(setTopics)
      .catch(console.error)
    fetch("/api/sources/")
      .then(res => res.json())
      .then(setSources)
      .catch(console.error)
  }, [])

  // Добавление темы
  const addTopic = async () => {
    if (!topicName.trim()) return
    const res = await fetch("/api/topics/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: topicName })
    })
    if (res.ok) {
      setTopicName("")
      const updated = await fetch("/api/topics/").then(r => r.json())
      setTopics(updated)
    }
  }

  // Добавление подтемы
  const addSubtopic = async () => {
    if (!subtopicName.trim() || !selectedTopicId) return
    const res = await fetch("/api/subtopics/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: subtopicName, topic_id: selectedTopicId })
    })
    if (res.ok) {
      setSubtopicName("")
    }
  }

  // Добавление источника (просто место/олимпиада, например "ВсОШ. Закл", "ВсОШ. Рег")
  const addSource = async () => {
    if (!sourceName.trim()) return
    const res = await fetch("/api/sources/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: sourceName })
    })
    if (res.ok) {
      const created = await res.json()
      setSources(prev => [...prev, created])
      setSourceName("")
    }
  }

  // Добавление автора
  const addAuthor = async () => {
    if (!authorName.trim()) return
    const res = await fetch("/api/authors/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: authorName })
    })
    if (res.ok) {
      setAuthorName("")
    }
  }

  return (
    <div className="p-8 space-y-8 text-white">
      <h1 className="text-3xl font-bold">Справочники</h1>
      <p className="text-white/60 -mt-6">
        Здесь добавляются источники (олимпиады), темы, подтемы и авторы — то, из чего собираются задачи.
      </p>

      {/* Добавить источник (олимпиаду) */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Добавить источник (олимпиаду)</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Название (например: ВсОШ. Закл)"
            className="text-black px-2 py-1 rounded"
          />
          <button
            onClick={addSource}
            className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
          >
            Добавить
          </button>
        </div>
        {sources.length > 0 && (
          <ul className="text-sm text-white/70 space-y-1">
            {sources.map(s => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Добавить тему */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Добавить тему</h2>
        <input
          type="text"
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          placeholder="Название темы"
          className="text-black px-2 py-1 rounded mr-2"
        />
        <button
          onClick={addTopic}
          className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
        >
          Добавить
        </button>
      </div>

      {/* Добавить подтему */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Добавить подтему</h2>
        <input
          type="text"
          value={subtopicName}
          onChange={(e) => setSubtopicName(e.target.value)}
          placeholder="Название подтемы"
          className="text-black px-2 py-1 rounded mr-2"
        />
        <select
          value={selectedTopicId ?? ""}
          onChange={(e) => setSelectedTopicId(Number(e.target.value))}
          className="text-black px-2 py-1 rounded mr-2"
        >
          <option value="">Выберите тему</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={addSubtopic}
          className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
        >
          Добавить
        </button>
      </div>

      {/* Добавить автора */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Добавить автора</h2>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Имя автора"
          className="text-black px-2 py-1 rounded mr-2"
        />
        <button
          onClick={addAuthor}
          className="bg-green-500 px-3 py-1 rounded hover:bg-green-600"
        >
          Добавить
        </button>
      </div>
    </div>
  )
}
