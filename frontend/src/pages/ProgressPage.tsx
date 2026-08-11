import { useEffect, useState } from "react"

type SourceCoverage = {
  source_id: number
  name: string
  total_tasks: number
  present_text: string
  missing_text: string
}

export default function ProgressPage() {
  const [rows, setRows] = useState<SourceCoverage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/progress/")
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка загрузки: ${res.status}`)
        return res.json()
      })
      .then((data: SourceCoverage[]) => setRows(data))
      .catch((e) => setLoadError(e.message || "Не удалось загрузить прогресс"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-white mt-10">Загрузка...</div>
  if (loadError) return <div className="text-center text-red-400 mt-10">{loadError}</div>

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-center text-white tracking-wider">
        Прогресс добавления задач
      </h1>
      <p className="text-center text-white/50 text-sm">
        Считается автоматически по реальным задачам в базе — какие годы и классы уже загружены.
      </p>

      <div className="space-y-6">
        {rows.map((r) => (
          <div key={r.source_id} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-xl font-bold text-white">
              {r.name} <span className="text-white/40 font-normal text-sm">({r.total_tasks} задач)</span>
            </h2>
            {r.total_tasks === 0 ? (
              <p className="mt-2 text-white/60">Задач пока нет.</p>
            ) : (
              <div className="mt-2 space-y-1 text-white/80">
                <p>
                  <span className="text-green-400 font-semibold">Есть:</span> {r.present_text}
                </p>
                {r.missing_text && (
                  <p>
                    <span className="text-red-400 font-semibold">Нет:</span> {r.missing_text}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
