import { useMemo } from "react"
import { renderLatexHtml } from "@/lib/latex"

type Props = {
  text?: string | null
  className?: string
}

export default function LatexContent({ text, className }: Props) {
  const html = useMemo(() => renderLatexHtml(text || ""), [text])
  if (!text) return null
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
