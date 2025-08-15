import { useEffect, useState } from "react"
import TaskCard from "@/components/TaskCard"
import { Button } from "@/components/ui/button"
import { generateLatex } from "@/lib/generateLatex"
import { Link } from "react-router-dom"

type ApiTask = {
  id: number
  text: string
  difficulty: number
  created_at: string
  source?: { id: number; name: string; year?: number; grade?: number }
  topics: { id: number; name: string }[]
  subtopics: { id: number; name: string; topic_id: number }[]
}

type Task = {
  id: number
  title: string
  tags: string[]
  year: number
  sourceName?: string    // <— явное имя источника
  grade?: number         // <— класс
}

type Source = { id: number; name: string }
type Topic = { id: number; name: string }
type Subtopic = { id: number; name: string; topic_id: number }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [sources, setSources] = useState<Source[]>([])
  const [grades, setGrades] = useState<number[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])

  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  const [selectedTopics, setSelectedTopics] = useState<number[]>([])
  const [selectedSubtopics, setSelectedSubtopics] = useState<number[]>([])

  const [selected, setSelected] = useState<number[]>([])

  // Загружаем фильтры при старте
  useEffect(() => {
    fetch(`/api/sources/`).then(r => r.json()).then(setSources).catch(console.error)
    fetch(`/api/grades/`).then(r => r.json()).then(setGrades).catch(console.error)
    fetch(`/api/topics/`).then(r => r.json()).then(setTopics).catch(console.error)
    fetch(`/api/subtopics/`).then(r => r.json()).then(setSubtopics).catch(console.error)
  }, [])

  // Загружаем задачи
  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    selectedSources.forEach(s => params.append("sources", s))
    selectedGrades.forEach(g => params.append("grades", String(g)))
    selectedTopics.forEach(t => params.append("topic_ids", String(t)))
    selectedSubtopics.forEach(st => params.append("subtopic_ids", String(st)))

    const url = `/api/tasks/?${params.toString()}`

    fetch(url, { credentials: "omit" })
      .then(async (res) => {
        const ct = res.headers.get("content-type") || ""
        const text = await res.text()

        if (!res.ok) {
          console.error(`[tasks] ${url} → HTTP ${res.status}. Preview:\n${text.slice(0, 400)}`)
          throw new Error(`Ошибка сервера: ${res.status}`)
        }
        if (!ct.includes("application/json")) {
          console.error(`[tasks] ${url} → non-JSON (${ct}). Preview:\n${text.slice(0, 400)}`)
          throw new Error("Сервер вернул не‑JSON")
        }
        return JSON.parse(text) as ApiTask[]
      })
      .then((data) => {
        const mapped: Task[] = data.map(t => ({
          id: t.id,
          title: t.text,
          tags: [
            ...(t.topics?.map(topic => topic.name) || []),
            ...(t.subtopics?.map(sub => sub.name) || []),
            t.source?.name || "",
            t.source?.grade ? `${t.source.grade} класс` : "",
            `Сложность: ${t.difficulty}`,
          ].filter(Boolean),
          year: t.source?.year || new Date(t.created_at).getFullYear(),
          sourceName: t.source?.name,
          grade: t.source?.grade,
        }))
        setTasks(mapped)
        // ✅ по умолчанию выбираем все задачи текущей выдачи
        setSelected(mapped.map(t => t.id))
      })
      .catch(err => {
        console.error("Ошибка загрузки задач:", err)
        setTasks([])
        setSelected([]) // чтобы не висели старые выбранные id
      })
      .finally(() => setIsLoading(false))
  }, [selectedSources, selectedGrades, selectedTopics, selectedSubtopics])


  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleFilter = <T,>(value: T, list: T[], setter: (val: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Фильтруем подтемы по выбранным темам
  const visibleSubtopics = subtopics.filter(st => selectedTopics.includes(st.topic_id))

  const downloadTex = () => {
    const selectedTasks = tasks.filter(t => selected.includes(t.id))
    const texContent = generateLatex(selectedTasks)
    const blob = new Blob([texContent], { type: "application/x-tex" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "astro-tasks.tex"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center text-white tracking-wider">Задачи по астрономии</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white/10 rounded-lg p-4 border border-white/20">
  {/* Источники */}
  <div>
    <h2 className="font-semibold mb-2 text-white">Олимпиады</h2>
    {sources.map(src => (
      <label key={src.id} className="block text-sm text-white/80">
        <input
          type="checkbox"
          className="mr-2"
          checked={selectedSources.includes(src.name)}
          onChange={() => toggleFilter(src.name, selectedSources, setSelectedSources)}
        />
        {src.name}
      </label>
    ))}
  </div>

  {/* Классы */}
  <div>
    <h2 className="font-semibold mb-2 text-white">Классы</h2>
    {grades.map(g => (
      <label key={g} className="block text-sm text-white/80">
        <input
          type="checkbox"
          className="mr-2"
          checked={selectedGrades.includes(g)}
          onChange={() => toggleFilter(g, selectedGrades, setSelectedGrades)}
        />
        {g} класс
      </label>
    ))}
  </div>

  {/* Темы */}
  <div>
    <h2 className="font-semibold mb-2 text-white">Темы</h2>
    {topics.map(t => (
      <label key={t.id} className="block text-sm text-white/80">
        <input
          type="checkbox"
          className="mr-2"
          checked={selectedTopics.includes(t.id)}
          onChange={() => {
            toggleFilter(t.id, selectedTopics, setSelectedTopics)
            // Сброс подтем
            setSelectedSubtopics(prev =>
              prev.filter(stId => {
                const st = subtopics.find(s => s.id === stId)
                return st && st.topic_id !== t.id
              })
            )
          }}
        />
        {t.name}
      </label>
    ))}
  </div>

  {/* Подтемы */}
  <div>
    <h2 className="font-semibold mb-2 text-white">Подтемы</h2>
    {visibleSubtopics.length === 0 ? (
      <p className="text-sm text-white/50 italic">Выберите тему</p>
    ) : (
      visibleSubtopics.map(st => (
        <label key={st.id} className="block text-sm text-white/80">
          <input
            type="checkbox"
            className="mr-2"
            checked={selectedSubtopics.includes(st.id)}
            onChange={() => toggleFilter(st.id, selectedSubtopics, setSelectedSubtopics)}
          />
          {st.name}
        </label>
      ))
    )}
  </div>
</div>


      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground">Ничего не найдено</p>
      ) : (
        <>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              {...task}
              selected={selected.includes(task.id)}
              toggleSelect={toggleSelect}
            />
          ))}
          <div className="flex gap-4 mt-6">
            <Button onClick={downloadTex}>
              Скачать TeX
            </Button>
            <Button onClick={() => console.log("PDF", selected)}>
              Скачать PDF
            </Button>
          </div>

        </>
      )}
    </div>
  )
}
