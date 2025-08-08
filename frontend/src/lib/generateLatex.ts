import type { Task } from "@/pages/TasksPage"

export function generateLatex(tasks: Task[]): string {
  return `
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[russian]{babel}
\\usepackage{amsmath}

\\begin{document}
\\title{Подборка задач}
\\date{}
\\maketitle

${tasks.map((t, i) => `
\\section*{Задача ${i + 1}: ${t.title}}
\\textbf{Год:} ${t.year}\\\\
\\textbf{Теги:} ${t.tags.join(", ")}\\\\
\\vspace{1em}
\\noindent Задача вставляется сюда...
`).join("\n")}

\\end{document}
`.trim()
}
