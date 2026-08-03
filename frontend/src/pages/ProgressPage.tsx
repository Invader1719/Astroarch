import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"

type Cell = { olympiad: string; year: number; grade: number }

const OLYMPIADS: { key: string; label: string }[] = [
  { key: "vsosh_final", label: "ВСЕРОС. ЗАКЛ" },
  { key: "vsosh_reg", label: "ВСЕРОС. РЕГ" },
  { key: "spbao", label: "СПБАО" },
  { key: "mao", label: "МАО" },
  { key: "kvaly", label: "КВАЛЫ" },
]

const YEARS = Array.from({ length: 2026 - 2000 + 1 }, (_, i) => 2000 + i)
const GRADES = [9, 10, 11]

const cellKey = (olympiad: string, year: number, grade: number) => `${olympiad}|${year}|${grade}`

export default function ProgressPage() {
  const { user, token } = useAuth()
  const canEdit = !!user && ["admin", "founder"].includes(user.role)

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/progress/")
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`)
        return res.json()
      })
      .then((cells: Cell[]) => {
        setChecked(new Set(cells.map((c) => cellKey(c.olympiad, c.year, c.grade))))
      })
      .catch((e) => setLoadError(e.message || "Не удалось загрузить прогресс"))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (olympiad: string, year: number, grade: number) => {
    if (!canEdit) return
    const key = cellKey(olympiad, year, grade)
    if (pending.has(key)) return

    const wasChecked = checked.has(key)
    setPending((prev) => new Set(prev).add(key))
    setChecked((prev) => {
      const next = new Set(prev)
      if (wasChecked) next.delete(key)
      else next.add(key)
      return next
    })

    try {
      const res = await fetch("/api/progress/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ olympiad, year, grade }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setChecked((prev) => {
        const next = new Set(prev)
        if (data.checked) next.add(key)
        else next.delete(key)
        return next
      })
    } catch (e) {
      console.error(e)
      // откатываем оптимистичное изменение при ошибке
      setChecked((prev) => {
        const next = new Set(prev)
        if (wasChecked) next.add(key)
        else next.delete(key)
        return next
      })
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  if (loading) return <div className="text-center text-white mt-10">Загрузка...</div>
  if (loadError) return <div className="text-center text-red-400 mt-10">{loadError}</div>

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold text-center text-white tracking-wider">
        Прогресс добавления задач
      </h1>

      {OLYMPIADS.map((o) => (
        <div key={o.key} className="space-y-3">
          <h2 className="text-3xl font-black tracking-widest text-white uppercase">{o.label}</h2>
          <div className="overflow-x-auto rounded-lg border border-white/20">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-white/10">
                  <th className="p-2 text-white/70 font-semibold border-b border-white/20">Год</th>
                  {GRADES.map((g) => (
                    <th key={g} className="p-2 text-white/70 font-semibold border-b border-white/20">
                      {g} класс
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {YEARS.map((y) => (
                  <tr key={y} className="odd:bg-white/[0.03]">
                    <td className="p-2 text-white/80 font-medium border-b border-white/10">{y}</td>
                    {GRADES.map((g) => {
                      const key = cellKey(o.key, y, g)
                      const isChecked = checked.has(key)
                      return (
                        <td key={g} className="p-2 border-b border-white/10">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => toggle(o.key, y, g)}
                            title={isChecked ? "Отмечено" : "Не отмечено"}
                            className={`w-7 h-7 rounded-md border flex items-center justify-center mx-auto transition ${
                              isChecked
                                ? "bg-green-500 border-green-400 text-white"
                                : "bg-zinc-900 border-white/20 text-transparent"
                            } ${canEdit ? "cursor-pointer hover:border-white/50" : "cursor-default"}`}
                          >
                            {isChecked ? "✓" : ""}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
