import { useEffect, useMemo, useRef, useState } from "react"
import TaskCard from "@/components/TaskCard"
import { Button } from "@/components/ui/button"

type ApiTask = {
  id: number
  title?: string
  text: string
  difficulty: number
  grades: number[]
  year: number
  created_at: string
  source?: { id: number; name: string }
  authors?: { id: number; name: string }[]
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
  grades?: number[]      // <— классы (может быть несколько — сквозная задача)
  authorName?: string    // <— авторы задачи (через запятую, если несколько)
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
  "Оптика": {
    border: "border-yellow-400/30",
    headerBg: "bg-yellow-400/10 hover:bg-yellow-400/15",
    chip: "bg-yellow-400/10 border-yellow-400/30 text-yellow-100/80 hover:border-yellow-400/60 hover:text-yellow-50",
    chipSelected: "bg-yellow-400/40 border-yellow-300 text-white",
    dot: "bg-yellow-400",
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

// Фильтры переживают переход на страницу задачи и обратно — храним их в
// sessionStorage, а не только в useState, который слетает при размонтировании
// TasksPage (переход по /task/:id и "Назад" на /tasks монтирует страницу заново).
type FiltersState = {
  searchInput: string
  selectedSources: string[]
  selectedGrades: number[]
  selectedTopics: number[]
  selectedSubtopics: number[]
  expandedTopics: number[]
  selectedAuthors: number[]
  yearMode: YearMode
  yearMin: number
  yearMax: number
  selectedYears: number[]
  difficultyMode: DifficultyMode
  difficultyMin: number
  difficultyMax: number
  selectedDifficulties: number[]
  sortBy: SortBy
  sortDir: "asc" | "desc"
}

const FILTERS_STORAGE_KEY = "astroarch:tasksFilters"

const DEFAULT_FILTERS: FiltersState = {
  searchInput: "",
  selectedSources: [],
  selectedGrades: [],
  selectedTopics: [],
  selectedSubtopics: [],
  expandedTopics: [],
  selectedAuthors: [],
  yearMode: "range",
  yearMin: 0,
  yearMax: 0,
  selectedYears: [],
  difficultyMode: "range",
  difficultyMin: DIFFICULTY_MIN,
  difficultyMax: DIFFICULTY_MAX,
  selectedDifficulties: [],
  sortBy: "",
  sortDir: "asc",
}

function loadStoredFilters(): FiltersState {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return DEFAULT_FILTERS
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_FILTERS
  }
}

function formatGrades(grades: number[]): string {
  const g = [...new Set(grades)].sort((a, b) => a - b)
  if (g.length === 0) return ""
  if (g.length === 1) return `${g[0]} класс`
  const isRange = g.every((v, i) => i === 0 || v === g[i - 1] + 1)
  return isRange ? `${g[0]}–${g[g.length - 1]} классы` : `${g.join(", ")} классы`
}

// Для подписей "(N)" у фильтров: задача проходит в счёт фасета, только если
// подходит под ВСЕ остальные активные фильтры — свой же фасет в проверку не
// включаем, иначе внутри одной категории всё, кроме выбранного, схлопнется в 0.
type FacetFilters = {
  sources?: string[]
  grades?: number[]
  topics?: number[]
  subtopics?: number[]
  authors?: number[]
}

function taskMatchesFacets(t: ApiTask, f: FacetFilters): boolean {
  if (f.sources && f.sources.length > 0 && (!t.source || !f.sources.includes(t.source.name))) return false
  if (f.grades && f.grades.length > 0 && !(t.grades ?? []).some(g => f.grades!.includes(g))) return false
  if (f.topics && f.topics.length > 0) {
    const ids = t.topics?.map(x => x.id) ?? []
    if (!ids.some(id => f.topics!.includes(id))) return false
  }
  if (f.subtopics && f.subtopics.length > 0) {
    const ids = t.subtopics?.map(x => x.id) ?? []
    if (!ids.some(id => f.subtopics!.includes(id))) return false
  }
  if (f.authors && f.authors.length > 0) {
    const ids = t.authors?.map(x => x.id) ?? []
    if (!ids.some(id => f.authors!.includes(id))) return false
  }
  return true
}

const PAGE_SIZE = 20

// Компактный список номеров страниц с многоточиями: 1 … 4 5 [6] 7 8 … 42
function getPageNumbers(current: number, total: number): (number | "...")[] {
  const delta = 2
  const pages: (number | "...")[] = [1]
  const start = Math.max(2, current - delta)
  const end = Math.min(total - 1, current + delta)
  if (start > 2) pages.push("...")
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push("...")
  if (total > 1) pages.push(total)
  return pages
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const resultsRef = useRef<HTMLDivElement>(null)

  const [sources, setSources] = useState<Source[]>([])
  const [grades, setGrades] = useState<number[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [authors, setAuthors] = useState<Author[]>([])

  // Для подписей "(N)" у каждого фильтра — сколько всего задач подходит под
  // значение, вне зависимости от остальных выбранных фильтров. Грузим один раз
  // весь список задач отдельно от основного (тот меняется вместе с фильтрами).
  const [countsTasks, setCountsTasks] = useState<ApiTask[]>([])

  const [initialFilters] = useState(loadStoredFilters)
  // если год уже был восстановлен из sessionStorage — не даём эффекту ниже
  // затереть его дефолтом из только что загруженного списка allYears
  const yearsRestoredRef = useRef(initialFilters.yearMin !== 0 || initialFilters.yearMax !== 0)

  const [selectedSources, setSelectedSources] = useState<string[]>(initialFilters.selectedSources)
  const [selectedGrades, setSelectedGrades] = useState<number[]>(initialFilters.selectedGrades)
  const [selectedTopics, setSelectedTopics] = useState<number[]>(initialFilters.selectedTopics)
  const [selectedSubtopics, setSelectedSubtopics] = useState<number[]>(initialFilters.selectedSubtopics)
  const [expandedTopics, setExpandedTopics] = useState<number[]>(initialFilters.expandedTopics)
  const [selectedAuthors, setSelectedAuthors] = useState<number[]>(initialFilters.selectedAuthors)

  const [allYears, setAllYears] = useState<number[]>([])
  const [yearMode, setYearMode] = useState<YearMode>(initialFilters.yearMode)
  const [yearMin, setYearMin] = useState(initialFilters.yearMin)
  const [yearMax, setYearMax] = useState(initialFilters.yearMax)
  const [selectedYears, setSelectedYears] = useState<number[]>(initialFilters.selectedYears)

  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>(initialFilters.difficultyMode)
  const [difficultyMin, setDifficultyMin] = useState(initialFilters.difficultyMin)
  const [difficultyMax, setDifficultyMax] = useState(initialFilters.difficultyMax)
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>(initialFilters.selectedDifficulties)
  const [sortBy, setSortBy] = useState<SortBy>(initialFilters.sortBy)
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialFilters.sortDir)

  const [selected, setSelected] = useState<number[]>([])
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [includeSource, setIncludeSource] = useState(true)
  const [includeAnswer, setIncludeAnswer] = useState(false)
  const [includeSolution, setIncludeSolution] = useState(false)

  // поиск по автору в списке фильтра — локальный UI‑стейт, в sessionStorage не сохраняем
  const [authorSearch, setAuthorSearch] = useState("")

  // поиск по тексту условия — с дебаунсом, чтобы не долбить сервер на каждое нажатие
  const [searchInput, setSearchInput] = useState(initialFilters.searchInput)
  const [search, setSearch] = useState(initialFilters.searchInput.trim())
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
    fetch(`/api/tasks/`).then(r => r.json()).then(setCountsTasks).catch(console.error)
    fetch(`/api/tasks/years/`)
      .then(r => r.json())
      .then((list: number[]) => {
        setAllYears(list)
        if (list.length > 0 && !yearsRestoredRef.current) {
          setYearMin(list[0])
          setYearMax(list[list.length - 1])
        }
      })
      .catch(console.error)
  }, [])

  // Сколько задач приходится на каждое значение фильтра — для подписей "(N)".
  // Каждый счётчик учитывает остальные активные фильтры (фасетный поиск):
  // выбрал олимпиаду — счётчики авторов/тем/классов пересчитались именно под неё.
  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>()
    const f: FacetFilters = { grades: selectedGrades, topics: selectedTopics, subtopics: selectedSubtopics, authors: selectedAuthors }
    countsTasks.forEach(t => {
      if (!taskMatchesFacets(t, f)) return
      if (t.source?.name) m.set(t.source.name, (m.get(t.source.name) ?? 0) + 1)
    })
    return m
  }, [countsTasks, selectedGrades, selectedTopics, selectedSubtopics, selectedAuthors])

  const gradeCounts = useMemo(() => {
    const m = new Map<number, number>()
    const f: FacetFilters = { sources: selectedSources, topics: selectedTopics, subtopics: selectedSubtopics, authors: selectedAuthors }
    countsTasks.forEach(t => {
      if (!taskMatchesFacets(t, f)) return
      t.grades?.forEach(g => m.set(g, (m.get(g) ?? 0) + 1))
    })
    return m
  }, [countsTasks, selectedSources, selectedTopics, selectedSubtopics, selectedAuthors])

  const authorCounts = useMemo(() => {
    const m = new Map<number, number>()
    const f: FacetFilters = { sources: selectedSources, grades: selectedGrades, topics: selectedTopics, subtopics: selectedSubtopics }
    countsTasks.forEach(t => {
      if (!taskMatchesFacets(t, f)) return
      t.authors?.forEach(a => m.set(a.id, (m.get(a.id) ?? 0) + 1))
    })
    return m
  }, [countsTasks, selectedSources, selectedGrades, selectedTopics, selectedSubtopics])

  const topicCounts = useMemo(() => {
    const m = new Map<number, number>()
    const f: FacetFilters = { sources: selectedSources, grades: selectedGrades, subtopics: selectedSubtopics, authors: selectedAuthors }
    countsTasks.forEach(t => {
      if (!taskMatchesFacets(t, f)) return
      t.topics?.forEach(tp => m.set(tp.id, (m.get(tp.id) ?? 0) + 1))
    })
    return m
  }, [countsTasks, selectedSources, selectedGrades, selectedSubtopics, selectedAuthors])

  const subtopicCounts = useMemo(() => {
    const m = new Map<number, number>()
    const f: FacetFilters = { sources: selectedSources, grades: selectedGrades, topics: selectedTopics, authors: selectedAuthors }
    countsTasks.forEach(t => {
      if (!taskMatchesFacets(t, f)) return
      t.subtopics?.forEach(st => m.set(st.id, (m.get(st.id) ?? 0) + 1))
    })
    return m
  }, [countsTasks, selectedSources, selectedGrades, selectedTopics, selectedAuthors])

  // Сохраняем фильтры в sessionStorage, чтобы они не слетали при возврате
  // со страницы задачи (TasksPage размонтируется при переходе на /task/:id)
  useEffect(() => {
    const state: FiltersState = {
      searchInput,
      selectedSources,
      selectedGrades,
      selectedTopics,
      selectedSubtopics,
      expandedTopics,
      selectedAuthors,
      yearMode,
      yearMin,
      yearMax,
      selectedYears,
      difficultyMode,
      difficultyMin,
      difficultyMax,
      selectedDifficulties,
      sortBy,
      sortDir,
    }
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // sessionStorage недоступен (приватный режим и т.п.) — просто не сохраняем
    }
  }, [
    searchInput, selectedSources, selectedGrades, selectedTopics, selectedSubtopics,
    expandedTopics, selectedAuthors, yearMode, yearMin, yearMax, selectedYears,
    difficultyMode, difficultyMin, difficultyMax, selectedDifficulties, sortBy, sortDir,
  ])

  // Загружаем задачи
  useEffect(() => {
    setIsLoading(true)
    setPage(1) // новая выдача — всегда начинаем с первой страницы
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
            formatGrades(t.grades),
            ...(t.topics?.map(topic => topic.name) || []),
            ...(t.subtopics?.map(sub => sub.name) || []),
            t.authors && t.authors.length > 0
              ? `${t.authors.length > 1 ? "Авторы" : "Автор"}: ${t.authors.map(a => a.name).join(", ")}`
              : "",
            `Сложность: ${t.difficulty}`,
          ].filter(Boolean),
          year: t.year,
          sourceName: t.source?.name,
          grades: t.grades,
          authorName: t.authors?.map(a => a.name).join(", "),
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


  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageTasks = tasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages))
    setPage(clamped)
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleFilter = <T,>(value: T, list: T[], setter: (val: T[]) => void) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  const toggleExpandedTopic = (topicId: number) => {
    setExpandedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    )
  }

  const resetFilters = () => {
    setSearchInput("")
    setSelectedSources([])
    setSelectedGrades([])
    setSelectedTopics([])
    setSelectedSubtopics([])
    setExpandedTopics([])
    setSelectedAuthors([])
    setAuthorSearch("")
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
        <span className="ml-1 text-xs text-white/40">({sourceCounts.get(src.name) ?? 0})</span>
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
        <span className="ml-1 text-xs text-white/40">({gradeCounts.get(g) ?? 0})</span>
      </label>
    ))}
  </div>

  {/* Авторы */}
  <div className="rounded-lg border border-white/20 p-3">
    <h2 className="font-semibold mb-2 text-white flex items-center gap-1.5">
      Авторы
      {selectedAuthors.length > 0 && (
        <span className="text-xs font-normal text-white/50">({selectedAuthors.length})</span>
      )}
    </h2>

    {authors.length === 0 ? (
      <p className="text-sm text-white/50 italic">Нет данных</p>
    ) : (
      <>
        {selectedAuthors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedAuthors.map(id => {
              const a = authors.find(a => a.id === id)
              if (!a) return null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleFilter(id, selectedAuthors, setSelectedAuthors)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-blue-400 bg-blue-500/40 text-white text-xs font-medium transition hover:bg-blue-500/60"
                  title="Убрать из выбранных"
                >
                  {a.name}
                  <span className="opacity-70">✕</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="relative mb-2">
          <input
            type="text"
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
            placeholder="Поиск автора..."
            className="w-full bg-zinc-900 border border-white/20 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition"
          />
          {authorSearch && (
            <button
              type="button"
              onClick={() => setAuthorSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition text-xs"
              title="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto pr-1 space-y-0.5">
          {(() => {
            const q = authorSearch.trim().toLowerCase()
            const filtered = q
              ? authors.filter(a => a.name.toLowerCase().includes(q))
              : authors
            if (filtered.length === 0) {
              return <p className="text-sm text-white/50 italic">Никого не найдено</p>
            }
            return filtered.map(a => (
              <label key={a.id} className="block text-sm text-white/80">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedAuthors.includes(a.id)}
                  onChange={() => toggleFilter(a.id, selectedAuthors, setSelectedAuthors)}
                />
                {a.name}
                <span className="ml-1 text-xs text-white/40">({authorCounts.get(a.id) ?? 0})</span>
              </label>
            ))
          })()}
        </div>
      </>
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
          {topics.map((t) => {
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
                    onClick={() => toggleExpandedTopic(t.id)}
                    className="flex-1 flex items-center justify-between gap-2 text-left"
                  >
                    <span className="font-semibold text-white text-sm">
                      {t.name}
                      <span className="ml-1.5 text-xs font-normal text-white/45">({topicCounts.get(t.id) ?? 0})</span>
                      {selectedCount > 0 && (
                        <span className="ml-1.5 text-xs font-semibold text-blue-300">выбрано: {selectedCount}</span>
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
                        <span className="ml-1 opacity-60">({subtopicCounts.get(st.id) ?? 0})</span>
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

      <div ref={resultsRef} className="scroll-mt-4">
        <span className="inline-block text-sm px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80">
          {isLoading
            ? "Загрузка..."
            : tasks.length === 0
              ? "Найдено задач: 0"
              : `Показано ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, tasks.length)} из ${tasks.length}`}
        </span>
      </div>

      {isLoading ? null : tasks.length === 0 ? (
        <p className="text-muted-foreground">Ничего не найдено</p>
      ) : (
        <>
          {pageTasks.map(task => (
            <TaskCard
              key={task.id}
              {...task}
              selected={selected.includes(task.id)}
              toggleSelect={toggleSelect}
            />
          ))}

          <Pagination page={currentPage} totalPages={totalPages} onGo={goToPage} />

          <div className="mt-6">{exportButtons}</div>
        </>
      )}
    </div>
  )
}

function Pagination({ page, totalPages, onGo }: { page: number; totalPages: number; onGo: (p: number) => void }) {
  if (totalPages <= 1) return null

  const pageBtn = (active: boolean) =>
    `min-w-[2.25rem] h-9 px-2 rounded-full border text-sm font-semibold transition ${
      active
        ? "bg-blue-500 border-blue-400 text-white"
        : "bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40"
    }`
  const navBtn =
    "h-9 px-3 rounded-full border text-sm font-medium transition bg-zinc-900 border-white/20 text-white/70 hover:text-white hover:border-white/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-white/70 disabled:hover:border-white/20"

  return (
    <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
      <button type="button" className={navBtn} onClick={() => onGo(1)} disabled={page === 1}>
        « Первая
      </button>
      <button type="button" className={navBtn} onClick={() => onGo(page - 1)} disabled={page === 1}>
        ‹ Пред.
      </button>

      {getPageNumbers(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-white/40 select-none">…</span>
        ) : (
          <button key={p} type="button" className={pageBtn(p === page)} onClick={() => onGo(p)}>
            {p}
          </button>
        )
      )}

      <button type="button" className={navBtn} onClick={() => onGo(page + 1)} disabled={page === totalPages}>
        След. ›
      </button>
      <button type="button" className={navBtn} onClick={() => onGo(totalPages)} disabled={page === totalPages}>
        Последняя »
      </button>
    </div>
  )
}
