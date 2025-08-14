import { useEffect, useState } from "react"

type Topic = { id: number; name: string }
type Author = { id: number; name: string }

export default function AdminPanel() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicName, setTopicName] = useState("")
  const [subtopicName, setSubtopicName] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [authorName, setAuthorName] = useState("")

  // Загружаем список тем при старте
  useEffect(() => {
    fetch("/api/topics/")
      .then(res => res.json())
      .then(setTopics)
      .catch(console.error)
  }, [])

  // Добавление темы
  const addTopic = async () => {
    if (!topicName.trim()) return
    const res = await fetch("/api/topics/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subtopicName, topic_id: selectedTopicId })
    })
    if (res.ok) {
      setSubtopicName("")
    }
  }

  // Добавление автора
  const addAuthor = async () => {
    if (!authorName.trim()) return
    const res = await fetch("/api/authors/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: authorName })
    })
    if (res.ok) {
      setAuthorName("")
    }
  }

  return (
    <div className="p-8 space-y-8 text-white">
      <h1 className="text-3xl font-bold">Панель администратора</h1>

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
