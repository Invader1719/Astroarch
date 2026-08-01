import { useState } from "react"

type Props = {
  text?: string | null
  label?: string
  className?: string
}

export default function CopyLatexButton({ text, label, className }: Props) {
  const [copied, setCopied] = useState(false)

  if (!text) return null

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error("Не удалось скопировать LaTeX:", err)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "text-xs px-2 py-1 rounded border border-white/20 hover:bg-white/10 text-white/80 transition"
      }
    >
      {copied ? "Скопировано ✓" : label ?? "Копировать LaTeX"}
    </button>
  )
}
