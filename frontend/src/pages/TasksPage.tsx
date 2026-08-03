import { useEffect, useState } from "react"
import TaskCard from "@/components/TaskCard"
import { Button } from "@/components/ui/button"

type ApiTask = {
  id: number
  title?: string
  text: string
  difficulty: number
  grade: number
  year: number
  created_at: string
  source?: { id: number; name: string }
  author?: { id: number; name: string }
  topics: { id: number; name: string }[]
  subtopics: { id: number; name: string; topic_id: number }[]
}

type Task = {
  id: number
  title?: string      // <— короткое название задачи (необязательно)
  text: string
  tags: string[]
  year: number
  sourceName?: string    // <— явное имя источника
  grade?: number         // <— класс
  authorName?: string    // <— автор задачи
}

type Source = { id: number; name: string }
type Topic = { id: number; name: string }
type Subtopic = { id: number; name: string; topic_id: number }
type Author = { id: number; name: string }

const DIFFICULTY_MIN = 1
const DIFFICULTY_MAX = 10
const DIFFICULTY_VALUES = Array.from(
  { length: DIFFICULTY_MAX - DIFFICULTY_MIN + 1 },
  (_, i) => DIFFICULTY_MIN + i
)

type DifficultyMode = "range" | "list"
type YearMode = "range" | "list"

type SortBy = "" | "difficulty" | "year" | "created_at" | "author"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "", label: "По умолчанию" },
  { value: "difficulty", label: "По сложности" },
  { value: "year", label: "По году" },
  { value: "created_at", label: "По дате добавления" },
  { value: "author", label: "По автору" },
]

// Мягкие фирменные цвета по темам — чтобы блок тем/подтем не сливался в одну "колбасу"
type TopicColor = { border: string; headerBg: string; chip: string; chipSelected: string; dot: string }

const TOPIC_COLORS: Record<string, TopicColor> = {
  "Небесная механика": {
    border: "border-sky-400/30",
    headerBg: "bg-sky-400/10 hover:bg-sky-400/15",
    chip: "bg-sky-400/10 border-sky-400/30 text-sky-100/80 hover:border-sky-400/60 hover:text-sky-50",
    chipSelected: "bg-sky-400/40 border-sky-300 text-white",
    dot: "bg-sky-400",
  },
  "Сферическая астрономия": {
    border: "border-lime-400/30",
    headerBg: "bg-lime-400/10 hover:bg-lime-400/15",
    chip: "bg-lime-400/10 border-lime-400/30 text-lime-100/80 hover:border-lime-400/60 hover:text-lime-50",
    chipSelected: "bg-lime-400/40 border-lime-300 text-white",
    dot: "bg-lime-400",
  },
  "Астрофизика": {
    border: "border-rose-400/30",
    headerBg: "bg-rose-400/10 hover:bg-rose-400/15",
    chip: "bg-rose-400/10 border-rose-400/30 text-rose-100/80 hover:border-rose-400/60 hover:text-rose-50",
    chipSelected: "bg-rose-400/40 border-rose-300 text-white",
    dot: "bg-rose-400",
  },
  "Излучение и взаимодействие частиц": {
    border: "border-fuchsia-400/30",
    headerBg: "bg-fuchsia-400/10 hover:bg-fuchsia-400/15",
    chip: "bg-fuchsia-400/10 border-fuchsia-400/30 text-fuchsia-100/80 hover:border-fuchsia-400/60 hover:text-fuchsia-50",
    chipSelected: "bg-fuchsia-400/40 border-fuchsia-300 text-white",
    dot: "bg-fuchsia-400",
  },
}

const DEFAULT_TOPIC_COLOR: TopicColor = {
  border: "border-white/20",
  headerBg: "bg-white/5 hover:bg-white/10",
  chip: "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40",
  chipSelected: "bg-blue-500 border-blue-400 text-white",
  dot: "bg-white/40",
}

const getTopicColor = (name: string): TopicColor => TOPIC_COLORS[name] ?? DEFAULT_TOPIC_COLOR

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [sources, setSources] = useState<Source[]>([])
  const [grades, setGrades] = useState<number[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [authors, setAuthors] = useState<Author[]>([])

  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedGrades, setSelectedGrades] = useState<number[]>([])
  const [selectedTopics, setSelectedTopics] = useState<number[]>([])
  const [selectedSubtopics, setSelectedSubtopics] = useState<number[]>([])
  const [expandedTopics, setExpandedTopics] = useState<number[]>([])
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>([])

  const [allYears, setAllYears] = useState<number[]>([])
  const [yearMode, setYearMode] = useState<YearMode>("range")
  const [yearMin, setYearMin] = useState(0)
  const [yearMax, setYearMax] = useState(0)
  const [selectedYears, setSelectedYears] = useState<number[]>([])

  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>("range")
  const [difficultyMin, setDifficultyMin] = useState(DIFFICULTY_MIN)
  const [difficultyMax, setDifficultyMax] = useState(DIFFICULTY_MAX)
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([])
  const [sortBy, setSortBy] = useState<SortBy>("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [selected, setSelected] = useState<number[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [includeSource, setIncludeSource] = useState(true)
  const [includeAnswer, setIncludeAnswer] = useState(false)
  const [includeSolution, setIncludeSolution] = useState(false)

  // поиск по тексту условия — с дебаунсом, чтобы не долбить сервер на каждое нажатие
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Загружаем фильтры при старте
  useEffect(() => {
    fetch(`/api/sources/`).then(r => r.json()).then(setSources).catch(console.error)
    fetch(`/api/grades/`).then(r => r.json()).then(setGrades).catch(console.error)
    fetch(`/api/topics/`).then(r => r.json()).then(setTopics).catch(console.error)
    fetch(`/api/subtopics/`).then(r => r.json()).then(setSubtopics).catch(console.error)
    fetch(`/api/authors/`).then(r => r.json()).then(setAuthors).catch(console.error)
    fetch(`/api/tasks/years/`)
      .then(r => r.json())
      .then((list: number[]) => {
        setAllYears(list)
        if (list.length > 0) {
          setYearMin(list[0])
          setYearMax(list[list.length - 1])
        }
      })
      .catch(console.error)
  }, [])

  // Загружаем задачи
  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams()
    if (search) params.append("search", search)
    selectedSources.forEach(s => params.append("sources", s))
    selectedGrades.forEach(g => params.append("grades", String(g)))
    selectedTopics.forEach(t => params.append("topic_ids", String(t)))
    selectedSubtopics.forEach(st => params.append("subtopic_ids", String(st)))
    selectedAuthors.forEach(a => params.append("author_ids", String(a)))
    if (yearMode === "list" && selectedYears.length > 0) {
      selectedYears.forEach(y => params.append("years", String(y)))
    } else if (allYears.length > 0) {
      params.append("year_min", String(yearMin))
      params.append("year_max", String(yearMax))
    }
    if (difficultyMode === "list" && selectedDifficulties.length > 0) {
      selectedDifficulties.forEach(d => params.append("difficulties", String(d)))
    } else {
      params.append("difficulty_min", String(difficultyMin))
      params.append("difficulty_max", String(difficultyMax))
    }
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
          title: t.title,
          text: t.text,
          tags: [
            t.source?.name || "",
            String(t.year),
            `${t.grade} класс`,
            ...(t.topics?.map(topic => topic.name) || []),
            ...(t.subtopics?.map(sub => sub.name) || []),
            t.author?.name ? `Автор: ${t.author.name}` : "",
            `Сложность: ${t.difficulty}`,
          ].filter(Boolean),
          year: t.year,
          sourceName: t.source?.name,
          grade: t.grade,
          authorName: t.author?.name,
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
  }, [search, selectedSources, selectedGrades, selectedTopics, selectedSubtopics, selectedAuthors, yearMode, yearMin, yearMax, selectedYears, allYears, difficultyMode, difficultyMin, difficultyMax, selectedDifficulties, sortBy, sortDir])


  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleFilter = <T,>(value: T, list: T[], setter: (val: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const toggleExpandedTopic = (topicId: number, neighborId?: number) => {
    setExpandedTopics(prev => {
      if (prev.includes(topicId)) {
        // сворачиваем только эту тему, соседнюю не трогаем
        return prev.filter(id => id !== topicId)
      }
      // разворачиваем эту тему и сразу соседнюю по сетке (2 колонки), если ещё не открыта
      const next = [...prev, topicId]
      if (neighborId !== undefined && !next.includes(neighborId)) {
        next.push(neighborId)
      }
      return next
    })
  }

  const resetFilters = () => {
    setSearchInput("")
    setSelectedSources([])
    setSelectedGrades([])
    setSelectedTopics([])
    setSelectedSubtopics([])
    setExpandedTopics([])
    setSelectedAuthors([])
    setYearMode("range")
    if (allYears.length > 0) {
      setYearMin(allYears[0])
      setYearMax(allYears[allYears.length - 1])
    }
    setSelectedYears([])
    setDifficultyMode("range")
    setDifficultyMin(DIFFICULTY_MIN)
    setDifficultyMax(DIFFICULTY_MAX)
    setSelectedDifficulties([])
    setSortBy("")
    setSortDir("asc")
  }

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    selectedSources.length > 0 ||
    selectedGrades.length > 0 ||
    selectedTopics.length > 0 ||
    selectedSubtopics.length > 0 ||
    selectedAuthors.length > 0 ||
    yearMode !== "range" ||
    (allYears.length > 0 && (yearMin !== allYears[0] || yearMax !== allYears[allYears.length - 1])) ||
    selectedYears.length > 0 ||
    difficultyMode !== "range" ||
    difficultyMin !== DIFFICULTY_MIN ||
    difficultyMax !== DIFFICULTY_MAX ||
    selectedDifficulties.length > 0 ||
    sortBy !== ""

  const handleYearMinChange = (value: number) => {
    setYearMin(Math.min(value, yearMax))
  }

  const handleYearMaxChange = (value: number) => {
    setYearMax(Math.max(value, yearMin))
  }

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
        body: JSON.stringify({
          task_ids: selected,
          include_source: includeSource,
          include_answer: includeAnswer,
          include_solution: includeSolution,
        }),
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
        body: JSON.stringify({
          task_ids: selected,
          include_source: includeSource,
          include_answer: includeAnswer,
          include_solution: includeSolution,
        }),
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
      params.append("include_source", String(includeSource))
      params.append("include_answer", String(includeAnswer))
      params.append("include_solution", String(includeSolution))
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

  const YesNoToggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-1 bg-zinc-900 border border-white/20 rounded-full p-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            value ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          Да
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${
            !value ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
          }`}
        >
          Нет
        </button>
      </div>
    </div>
  )

  const exportButtons = (
    <div className="flex flex-col gap-3">
      {exportError && <p className="text-red-400 text-sm">{exportError}</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <YesNoToggle label="Добавлять источник" value={includeSource} onChange={setIncludeSource} />
        <YesNoToggle label="Добавлять ответ" value={includeAnswer} onChange={setIncludeAnswer} />
        <YesNoToggle label="Добавлять решение" value={includeSolution} onChange={setIncludeSolution} />
      </div>
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

      <div className="relative max-w-2xl mx-auto w-full">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Поиск по названию или тексту задачи..."
          className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
            title="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/10 rounded-lg p-4 border border-white/20">
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

  {/* Авторы */}
  <div>
    <h2 className="font-semibold mb-2 text-white">Авторы</h2>
    {authors.length === 0 ? (
      <p className="text-sm text-white/50 italic">Нет данных</p>
    ) : (
      authors.map(a => (
        <label key={a.id} className="block text-sm text-white/80">
          <input
            type="checkbox"
            className="mr-2"
            checked={selectedAuthors.includes(a.id)}
            onChange={() => toggleFilter(a.id, selectedAuthors, setSelectedAuthors)}
          />
          {a.name}
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

      {/* Темы и подтемы — отдельный блок, каждая тема своим цветом и сворачивается */}
      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        <h2 className="font-semibold mb-3 text-white">Темы и подтемы</h2>

        {selectedSubtopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
            {selectedSubtopics.map(id => {
              const st = subtopics.find(s => s.id === id)
              if (!st) return null
              const topicName = topics.find(t => t.id === st.topic_id)?.name ?? ""
              const color = getTopicColor(topicName)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleFilter(id, selectedSubtopics, setSelectedSubtopics)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition ${color.chipSelected}`}
                  title="Убрать из выбранных"
                >
                  {st.name}
                  <span className="opacity-70">✕</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topics.map((t, i) => {
            // сетка в 2 колонки — сосед по строке: чётный индекс -> следующий, нечётный -> предыдущий
            const neighborTopic = i % 2 === 0 ? topics[i + 1] : topics[i - 1]
            const color = getTopicColor(t.name)
            const isExpanded = expandedTopics.includes(t.id)
            const topicSubtopics = subtopics.filter(s => s.topic_id === t.id)
            const selectedCount = topicSubtopics.filter(s => selectedSubtopics.includes(s.id)).length

            return (
              <div key={t.id} className={`rounded-lg border ${color.border} overflow-hidden`}>
                <div className={`flex items-center gap-2 px-3 py-2 transition ${color.headerBg}`}>
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(t.id)}
                    onChange={() => {
                      toggleFilter(t.id, selectedTopics, setSelectedTopics)
                      // Сброс подтем при снятии темы
                      setSelectedSubtopics(prev =>
                        prev.filter(stId => {
                          const st = subtopics.find(s => s.id === stId)
                          return st && st.topic_id !== t.id
                        })
                      )
                    }}
                  />
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                  <button
                    type="button"
                    onClick={() => toggleExpandedTopic(t.id, neighborTopic?.id)}
                    className="flex-1 flex items-center justify-between gap-2 text-left"
                  >
                    <span className="font-semibold text-white text-sm">
                      {t.name}
                      {selectedCount > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-white/60">({selectedCount})</span>
                      )}
                    </span>
                    <span className="text-white/50 text-xs shrink-0">{isExpanded ? "▲" : "▼"}</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-3 flex flex-wrap gap-2 bg-black/10 max-h-64 overflow-y-auto">
                    {topicSubtopics.map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleFilter(st.id, selectedSubtopics, setSelectedSubtopics)}
                        className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${
                          selectedSubtopics.includes(st.id) ? color.chipSelected : color.chip
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        {/* Год олимпиады */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h2 className="font-semibold text-white">
            Год олимпиады
            {allYears.length === 0
              ? ""
              : yearMode === "range"
                ? `: ${yearMin}–${yearMax}`
                : selectedYears.length > 0
                  ? `: ${[...selectedYears].sort((a, b) => a - b).join(", ")}`
                  : ""}
          </h2>

          {/* Переключатель режима: диапазон / конкретные годы */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/20 rounded-full p-1">
            <button
              type="button"
              onClick={() => setYearMode("range")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                yearMode === "range" ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Диапазон
            </button>
            <button
              type="button"
              onClick={() => setYearMode("list")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                yearMode === "list" ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Числа
            </button>
          </div>
        </div>

        {allYears.length === 0 ? (
          <p className="text-sm text-white/50 italic">Нет данных</p>
        ) : yearMode === "range" ? (
          <div className="range-slider max-w-[500px]">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-2 rounded-full bg-white/20" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-blue-500"
              style={{
                left: `${((yearMin - allYears[0]) / Math.max(allYears[allYears.length - 1] - allYears[0], 1)) * 100}%`,
                right: `${100 - ((yearMax - allYears[0]) / Math.max(allYears[allYears.length - 1] - allYears[0], 1)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={allYears[0]}
              max={allYears[allYears.length - 1]}
              value={yearMin}
              onChange={(e) => handleYearMinChange(Number(e.target.value))}
            />
            <input
              type="range"
              min={allYears[0]}
              max={allYears[allYears.length - 1]}
              value={yearMax}
              onChange={(e) => handleYearMaxChange(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allYears.map(y => (
              <button
                key={y}
                type="button"
                onClick={() => toggleFilter(y, selectedYears, setSelectedYears)}
                className={`px-3 h-10 rounded-full border text-sm font-semibold transition ${
                  selectedYears.includes(y)
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
        {/* Сложность */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <h2 className="font-semibold text-white">
            Сложность
            {difficultyMode === "range"
              ? `: ${difficultyMin}–${difficultyMax}`
              : selectedDifficulties.length > 0
                ? `: ${[...selectedDifficulties].sort((a, b) => a - b).join(", ")}`
                : ""}
          </h2>

          {/* Переключатель режима: диапазон / конкретные числа */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/20 rounded-full p-1">
            <button
              type="button"
              onClick={() => setDifficultyMode("range")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                difficultyMode === "range" ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Диапазон
            </button>
            <button
              type="button"
              onClick={() => setDifficultyMode("list")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                difficultyMode === "list" ? "bg-blue-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Числа
            </button>
          </div>
        </div>

        {difficultyMode === "range" ? (
          <div className="range-slider max-w-[500px]">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-2 rounded-full bg-white/20" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-blue-500"
              style={{
                left: `${((difficultyMin - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%`,
                right: `${100 - ((difficultyMax - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={DIFFICULTY_MIN}
              max={DIFFICULTY_MAX}
              value={difficultyMin}
              onChange={(e) => handleDifficultyMinChange(Number(e.target.value))}
            />
            <input
              type="range"
              min={DIFFICULTY_MIN}
              max={DIFFICULTY_MAX}
              value={difficultyMax}
              onChange={(e) => handleDifficultyMaxChange(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_VALUES.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => toggleFilter(n, selectedDifficulties, setSelectedDifficulties)}
                className={`w-10 h-10 rounded-full border text-sm font-semibold transition ${
                  selectedDifficulties.includes(n)
                    ? "bg-blue-500 border-blue-400 text-white"
                    : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 bg-white/10 rounded-lg p-4 border border-white/20">
        {/* Сортировка */}
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
