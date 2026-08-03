import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import LatexContent from "@/components/LatexContent"
import CopyLatexButton from "@/components/CopyLatexButton"

type TaskCardProps = {
  title?: string    // короткое название задачи (необязательно)
  text: string       // условие задачи
  tags: string[]
  year: number
  id: number
  selected: boolean
  toggleSelect: (id: number) => void
  authorName?: string
}

export default function TaskCard({ title, text, tags, id, selected, toggleSelect }: TaskCardProps) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => toggleSelect(id)}
            className="mt-1"
          />
          <div className="flex-1">
            {title && (
              <p className="text-base font-semibold uppercase tracking-wider text-blue-300/70 mb-1">
                {title}
              </p>
            )}
            <LatexContent
              text={text}
              className="text-xl font-semibold mb-2"
              imageCaption={title ? `К задаче «${title}»` : "К задаче"}
            />
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link to={`/task/${id}`}>Открыть</Link>
              </Button>
              <CopyLatexButton text={text} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
