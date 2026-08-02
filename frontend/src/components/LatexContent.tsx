import { useMemo, useRef, type ClipboardEvent } from "react"
import { renderLatexHtml } from "@/lib/latex"

type Props = {
  text?: string | null
  className?: string
}

export default function LatexContent({ text, className }: Props) {
  const html = useMemo(() => renderLatexHtml(text || ""), [text])
  const ref = useRef<HTMLDivElement>(null)

  // Выделение внутри отрендеренной таблицы (KaTeX-формулы в ячейках + HTML-разметка
  // таблицы) копируется браузером криво — при копировании таблицы отдаём вместо
  // этого исходный LaTeX целиком, как и кнопка "Скопировать LaTeX".
  const handleCopy = (e: ClipboardEvent<HTMLDivElement>) => {
    if (!text || !ref.current) return
    const selection = window.getSelection()
    if (!selection) return
    const touchesTable = [selection.anchorNode, selection.focusNode].some((node) => {
      if (!node) return false
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
      return el && ref.current!.contains(el) && !!el.closest("table")
    })
    if (touchesTable) {
      e.preventDefault()
      e.clipboardData.setData("text/plain", text)
    }
  }

  if (!text) return null
  return (
    <div
      ref={ref}
      className={className}
      onCopy={handleCopy}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
