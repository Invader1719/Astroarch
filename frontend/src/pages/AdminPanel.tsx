import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import EditableRow from "@/components/EditableRow"

type Topic = { id: number; name: string }
type Subtopic = { id: number; name: string; topic_id: number }
type Author = { id: number; name: string }
type Source = { id: number; name: string }

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data.detail || `Ошибка: ${res.status}`
  } catch {
    return `Ошибка: ${res.status}`
  }
}

export default function AdminPanel() {
  const { token } = useAuth()
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const [topics, setTopics] = useState<Topic[]>([])
  const [topicName, setTopicName] = useState("")
  const [topicError, setTopicError] = useState<string | null>(null)

  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [subtopicName, setSubtopicName] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [subtopicError, setSubtopicError] = useState<string | null>(null)

  const [authors, setAuthors] = useState<Author[]>([])
  const [authorName, setAuthorName] = useState("")
  const [authorError, setAuthorError] = useState<string | null>(null)

  const [sources, setSources] = useState<Source[]>([])
  const [sourceName, setSourceName] = useState("")
  const [sourceError, setSourceError] = useState<string | null>(null)

  const loadAll = () => {
    fetch("/api/topics/").then(r => r.json()).then(setTopics).catch(console.error)
    fetch("/api/subtopics/").then(r => r.json()).then(setSubtopics).catch(console.error)
    fetch("/api/sources/").then(r => r.json()).then(setSources).catch(console.error)
    fetch("/api/authors/").then(r => r.json()).then(setAuthors).catch(console.error)
  }

  useEffect(() => {
    loadAll()
  }, [])

  // --- Источники ---
  const addSource = async () => {
    if (!sourceName.trim()) return
    setSourceError(null)
    const res = await fetch("/api/sources/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: sourceName })
    })
    if (res.ok) {
      const created = await res.json()
      setSources(prev => [...prev, created])
      setSourceName("")
    } else {
      setSourceError(await extractError(res))
    }
  }

  const renameSource = async (id: number, name: string) => {
    const res = await fetch(`/api/sources/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ name }) })
    if (!res.ok) throw new Error(await extractError(res))
    const updated = await res.json()
    setSources(prev => prev.map(s => (s.id === id ? updated : s)))
  }

  const deleteSource = async (id: number) => {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await extractError(res))
    setSources(prev => prev.filter(s => s.id !== id))
  }

  // --- Темы ---
  const addTopic = async () => {
    if (!topicName.trim()) return
    setTopicError(null)
    const res = await fetch("/api/topics/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: topicName })
    })
    if (res.ok) {
      const created = await res.json()
      setTopics(prev => [...prev, created])
      setTopicName("")
    } else {
      setTopicError(await extractError(res))
    }
  }

  const renameTopic = async (id: number, name: string) => {
    const res = await fetch(`/api/topics/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ name }) })
    if (!res.ok) throw new Error(await extractError(res))
    const updated = await res.json()
    setTopics(prev => prev.map(t => (t.id === id ? updated : t)))
  }

  const deleteTopic = async (id: number) => {
    const res = await fetch(`/api/topics/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await extractError(res))
    setTopics(prev => prev.filter(t => t.id !== id))
  }

  // --- Подтемы ---
  const addSubtopic = async () => {
    if (!subtopicName.trim() || !selectedTopicId) return
    setSubtopicError(null)
    const res = await fetch("/api/subtopics/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: subtopicName, topic_id: selectedTopicId })
    })
    if (res.ok) {
      const created = await res.json()
      setSubtopics(prev => [...prev, created])
      setSubtopicName("")
    } else {
      setSubtopicError(await extractError(res))
    }
  }

  const renameSubtopic = async (id: number, name: string, topicId: number) => {
    const res = await fetch(`/api/subtopics/${id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ name, topic_id: topicId }),
    })
    if (!res.ok) throw new Error(await extractError(res))
    const updated = await res.json()
    setSubtopics(prev => prev.map(s => (s.id === id ? updated : s)))
  }

  const deleteSubtopic = async (id: number) => {
    const res = await fetch(`/api/subtopics/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await extractError(res))
    setSubtopics(prev => prev.filter(s => s.id !== id))
  }

  // --- Авторы ---
  const addAuthor = async () => {
    if (!authorName.trim()) return
    setAuthorError(null)
    const res = await fetch("/api/authors/", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: authorName })
    })
    if (res.ok) {
      const created = await res.json()
      setAuthors(prev => [...prev, created])
      setAuthorName("")
    } else {
      setAuthorError(await extractError(res))
    }
  }

  const renameAuthor = async (id: number, name: string) => {
    const res = await fetch(`/api/authors/${id}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify({ name }) })
    if (!res.ok) throw new Error(await extractError(res))
    const updated = await res.json()
    setAuthors(prev => prev.map(a => (a.id === id ? updated : a)))
  }

  const deleteAuthor = async (id: number) => {
    const res = await fetch(`/api/authors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await extractError(res))
    setAuthors(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="p-8 space-y-8 text-white">
      <h1 className="text-3xl font-bold">Справочники</h1>
      <p className="text-white/60 -mt-6">
        Здесь добавляются, переименовываются и удаляются источники (олимпиады), темы, подтемы и авторы —
        то, из чего собираются задачи. Удалить нельзя то, что уже используется в задачах.
      </p>

      {/* Источники */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Источники (олимпиады)</h2>
        {sourceError && <p className="text-red-400 text-sm mb-2">{sourceError}</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Название (например: ВсОШ. Закл)"
            className="text-black px-2 py-1 rounded"
          />
          <button onClick={addSource} className="bg-green-500 px-3 py-1 rounded hover:bg-green-600">
            Добавить
          </button>
        </div>
        {sources.length > 0 && (
          <ul className="space-y-1 max-w-md">
            {sources.map(s => (
              <EditableRow
                key={s.id}
                name={s.name}
                onRename={(name) => renameSource(s.id, name)}
                onDelete={() => deleteSource(s.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Темы */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Темы</h2>
        {topicError && <p className="text-red-400 text-sm mb-2">{topicError}</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Название темы"
            className="text-black px-2 py-1 rounded"
          />
          <button onClick={addTopic} className="bg-green-500 px-3 py-1 rounded hover:bg-green-600">
            Добавить
          </button>
        </div>
        {topics.length > 0 && (
          <ul className="space-y-1 max-w-md">
            {topics.map(t => (
              <EditableRow
                key={t.id}
                name={t.name}
                onRename={(name) => renameTopic(t.id, name)}
                onDelete={() => deleteTopic(t.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Подтемы */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Подтемы</h2>
        {subtopicError && <p className="text-red-400 text-sm mb-2">{subtopicError}</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={subtopicName}
            onChange={(e) => setSubtopicName(e.target.value)}
            placeholder="Название подтемы"
            className="text-black px-2 py-1 rounded"
          />
          <select
            value={selectedTopicId ?? ""}
            onChange={(e) => setSelectedTopicId(Number(e.target.value))}
            className="text-black px-2 py-1 rounded"
          >
            <option value="">Выберите тему</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={addSubtopic} className="bg-green-500 px-3 py-1 rounded hover:bg-green-600">
            Добавить
          </button>
        </div>

        {topics.map((t) => {
          const own = subtopics.filter((st) => st.topic_id === t.id)
          if (own.length === 0) return null
          return (
            <div key={t.id} className="mb-3 last:mb-0">
              <p className="text-xs uppercase tracking-wide text-white/40 mb-1">{t.name}</p>
              <ul className="space-y-1 max-w-md">
                {own.map((st) => (
                  <EditableRow
                    key={st.id}
                    name={st.name}
                    onRename={(name) => renameSubtopic(st.id, name, st.topic_id)}
                    onDelete={() => deleteSubtopic(st.id)}
                  />
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Авторы */}
      <div className="bg-white/10 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Авторы</h2>
        {authorError && <p className="text-red-400 text-sm mb-2">{authorError}</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Имя автора"
            className="text-black px-2 py-1 rounded"
          />
          <button onClick={addAuthor} className="bg-green-500 px-3 py-1 rounded hover:bg-green-600">
            Добавить
          </button>
        </div>
        {authors.length > 0 && (
          <ul className="space-y-1 max-w-md">
            {authors.map(a => (
              <EditableRow
                key={a.id}
                name={a.name}
                onRename={(name) => renameAuthor(a.id, name)}
                onDelete={() => deleteAuthor(a.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
