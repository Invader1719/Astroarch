import { useState } from "react"

type Props = {
  name: string
  onRename: (newName: string) => Promise<void>
  onDelete: () => Promise<void>
}

export default function EditableRow({ name, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === name) {
      setEditing(false)
      setValue(name)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onRename(trimmed)
      setEditing(false)
    } catch (e: any) {
      setError(e.message || "Ошибка сохранения")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm(`Удалить «${name}»?`)) return
    setBusy(true)
    setError(null)
    try {
      await onDelete()
    } catch (e: any) {
      setError(e.message || "Ошибка удаления")
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-2 text-sm text-white/70">
      {editing ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            autoFocus
            className="text-black px-1.5 py-0.5 rounded text-sm flex-1 min-w-0"
          />
          <button type="button" onClick={save} disabled={busy} className="text-green-400 hover:text-green-300 text-xs shrink-0">
            ✓
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setValue(name); setError(null) }}
            disabled={busy}
            className="text-white/40 hover:text-white text-xs shrink-0"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate">{name}</span>
          <button type="button" onClick={() => setEditing(true)} className="text-white/40 hover:text-white text-xs shrink-0" title="Переименовать">
            ✎
          </button>
          <button type="button" onClick={remove} disabled={busy} className="text-red-400/70 hover:text-red-400 text-xs shrink-0" title="Удалить">
            🗑
          </button>
        </>
      )}
      {error && <span className="text-red-400 text-xs shrink-0">{error}</span>}
    </li>
  )
}
