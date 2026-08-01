import { useEffect, useState } from "react"
import TaskCard from "@/components/TaskCard"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

type ApiTask = {
  id: number
  text: string
  difficulty: number
  grade?: number
  created_at: string
  source?: { id: number; name: string; year?: number }
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

const DIFFICULTY_MIN = 1
const DIFFICULTY_MAX = 10

type SortBy = "" | "difficulty" | "year" | "created_at"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "", label: "По умолчанию" },
  { value: "difficulty", label: "По сложности" },
  { value: "year", label: "По году" },
  { value: "created_at", label: "По дате добавления" },
]

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

  const [difficultyMin, setDifficultyMin] = useState(DIFFICULTY_MIN)
  const [difficultyMax, setDifficultyMax] = useState(DIFFICULTY_MAX)
  const [sortBy, setSortBy] = useState<SortBy>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [selected, setSelected] = useState<number[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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
    params.append("difficulty_min", String(difficultyMin))
    params.append("difficulty_max", String(difficultyMax))
    if (sortBy) {
      params.append("sort_by", sortBy)
      params.append("sort_dir", sortDir)
    }

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
            t.grade ? `${t.grade} класс` : "",
            `Сложность: ${t.difficulty}`,
          ].filter(Boolean),
          year: t.source?.year || new Date(t.created_at).getFullYear(),
          sourceName: t.source?.name,
          grade: t.grade,
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
  }, [selectedSources, selectedGrades, selectedTopics, selectedSubtopics, difficultyMin, difficultyMax, sortBy, sortDir])


  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleFilter = <T,>(value: T, list: T[], setter: (val: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Фильтруем подтемы по выбранным темам
  const visibleSubtopics = subtopics.filter(st => selectedTopics.includes(st.topic_id))

  const resetFilters = () => {
    setSelectedSources([])
    setSelectedGrades([])
    setSelectedTopics([])
    setSelectedSubtopics([])
    setDifficultyMin(DIFFICULTY_MIN)
    setDifficultyMax(DIFFICULTY_MAX)
    setSortBy("")
    setSortDir("asc")
  }

  const hasActiveFilters =
    selectedSources.length > 0 ||
    selectedGrades.length > 0 ||
    selectedTopics.length > 0 ||
    selectedSubtopics.length > 0 ||
    difficultyMin !== DIFFICULTY_MIN ||
    difficultyMax !== DIFFICULTY_MAX ||
    sortBy !== ""

  const handleDifficultyMinChange = (value: number) => {
    setDifficultyMin(Math.min(value, difficultyMax))
  }

  const handleDifficultyMaxChange = (value: number) => {
    setDifficultyMax(Math.max(value, difficultyMin))
  }

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadLatex = async () => {
    if (selected.length === 0) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch("/api/export/tex/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: selected }),
      })
      if (!res.ok) throw new Error(`Ошибка экспорта LaTeX: ${res.status}`)
      triggerBlobDownload(await res.blob(), "astro-tasks.tex")
    } catch (err) {
      console.error(err)
      setExportError("Не удалось скачать LaTeX. Попробуйте ещё раз.")
    } finally {
      setExporting(false)
    }
  }

  const downloadZip = async () => {
    if (selected.length === 0) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch("/api/export/tex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: selected }),
      })
      if (!res.ok) throw new Error(`Ошибка экспорта ZIP: ${res.status}`)
      triggerBlobDownload(await res.blob(), "astro-tasks-tex.zip")
    } catch (err) {
      console.error(err)
      setExportError("Не удалось скачать ZIP. Попробуйте ещё раз.")
    } finally {
      setExporting(false)
    }
  }

  const downloadPdf = async () => {
    if (selected.length === 0) return
    setExporting(true)
    setExportError(null)
    try {
      const params = new URLSearchParams()
      selected.forEach(id => params.append("task_ids", String(id)))
      const res = await fetch(`/api/generate/?${params.toString()}`)
      if (!res.ok) throw new Error(`Ошибка генерации PDF: ${res.status}`)
      triggerBlobDownload(await res.blob(), "astro-tasks.pdf")
    } catch (err) {
      console.error(err)
      setExportError("Не удалось сгенерировать PDF. Попробуйте ещё раз.")
    } finally {
      setExporting(false)
    }
  }

  const exportButtons = (
    <div className="flex flex-col gap-2">
      {exportError && <p className="text-red-400 text-sm">{exportError}</p>}
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadLatex} disabled={selected.length === 0 || exporting}>
          {exporting ? "Готовим файл..." : "Скачать LaTeX"}
        </Button>
        <Button onClick={downloadZip} disabled={selected.length === 0 || exporting}>
          {exporting ? "Готовим файл..." : "Скачать ZIP"}
        </Button>
        <Button onClick={downloadPdf} disabled={selected.length === 0 || exporting}>
          {exporting ? "Готовим файл..." : "Скачать PDF"}
        </Button>
      </div>
    </div>
  )

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

  <div className="col-span-full flex justify-end">
    <button
      type="button"
      onClick={resetFilters}
      disabled={!hasActiveFilters}
      className="text-sm px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-400 text-white font-semibold shadow shadow-red-500/30 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed transition whitespace-nowrap"
    >
      Сбросить всё
    </button>
  </div>
</div>

      <div className="flex flex-wrap items-center gap-8 bg-white/10 rounded-lg p-4 border border-white/20">
        {/* Сложность */}
        <div className="flex-1 min-w-[260px]">
          <h2 className="font-semibold mb-2 text-white">
            Сложность: {difficultyMin}–{difficultyMax}
          </h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-white/80">
              от
              <input
                type="range"
                min={DIFFICULTY_MIN}
                max={DIFFICULTY_MAX}
                value={difficultyMin}
                onChange={(e) => handleDifficultyMinChange(Number(e.target.value))}
                className="flex-1"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              до
              <input
                type="range"
                min={DIFFICULTY_MIN}
                max={DIFFICULTY_MAX}
                value={difficultyMax}
                onChange={(e) => handleDifficultyMaxChange(Number(e.target.value))}
                className="flex-1"
              />
            </label>
          </div>
        </div>

        {/* Сортировка */}
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-white">Сортировка:</h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-zinc-900 text-white border border-white/20 rounded px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!sortBy}
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="bg-zinc-900 text-white border border-white/20 rounded px-2 py-1 text-sm disabled:opacity-40"
            title={sortDir === "asc" ? "По возрастанию" : "По убыванию"}
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {exportButtons}

      <div>
        <span className="inline-block text-sm px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80">
          {isLoading
            ? "Загрузка..."
            : `Найдено задач: ${tasks.length}`}
        </span>
      </div>

      {isLoading ? null : tasks.length === 0 ? (
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
          <div className="mt-6">{exportButtons}</div>
        </>
      )}
    </div>
  )
}
