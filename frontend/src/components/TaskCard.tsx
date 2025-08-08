import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

type TaskCardProps = {
  title: string
  tags: string[]
  year: number
  id: number
  selected: boolean
  toggleSelect: (id: number) => void
}

export default function TaskCard({ title, tags, year, id, selected, toggleSelect }: TaskCardProps) {
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
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mb-2">Год: {year}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <Button variant="outline" asChild>
              <Link to={`/task/${id}`}>Открыть</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
