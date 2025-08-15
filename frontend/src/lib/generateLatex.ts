import type { Task } from "@/pages/TasksPage"

// Простое экранирование спецсимволов LaTeX
function latexEscape(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/\^/g, "\\^{}")
    .replace(/~/g, "\\~{}")
}

export function generateLatex(tasks: Task[]): string {
  const header = `
\\documentclass[a4paper,12pt]{article}

% Минимальные поля
\\usepackage[a4paper,top=2.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}

% Прикольный шрифт
\\usepackage[T1]{fontenc}
\\usepackage{cmbright}

% Язык
\\usepackage[russian]{babel}
\\usepackage[utf8]{inputenc}

% Математика и оформление
\\usepackage{amsmath, amssymb, mathtools}
\\usepackage{enumitem}
\\usepackage{fancyhdr}
\\usepackage{graphicx}
\\usepackage{titlesec}

% Заголовки — компактные
\\titleformat{\\section}{\\normalfont\\large\\bfseries}{\\thesection:}{0.5em}{}
\\titlespacing*{\\section}{0pt}{0.8em}{0.3em}

% Подзаголовки (если будут)
\\titleformat{\\subsection}{\\normalfont\\normalsize\\bfseries}{\\thesubsection.}{0.5em}{}
\\titlespacing*{\\subsection}{0pt}{0.5em}{0.2em}

% Списки — компактные
\\setlist[itemize]{noitemsep, topsep=0pt, left=1.2em}
\\setlist[enumerate]{noitemsep, topsep=0pt, left=1.2em, label=\\arabic*.}

% Про картинки
\\usepackage{wrapfig,caption,float}

% Компактные отступы вокруг рисунков и расстояние между колонками
\\setlength{\\intextsep}{0.5em}
\\setlength{\\columnsep}{1em}

% Аккуратные подписи (не растягивать по ширине)
\\captionsetup{font=small,labelfont=bf,justification=raggedright,singlelinecheck=false}

% Астро символы типо \\moon
\\usepackage{wasysym}

% Колонтитулы
\\pagestyle{fancy}
\\fancyhf{}
% Верхний
\\lhead{Per Aspera Ad Astra}
\\rhead{Страница \\thepage}
\\renewcommand{\\headrulewidth}{0.4pt}
% Нижний
\\lfoot{Тема: }
\\cfoot{Astroach}
\\rfoot{Станислав Потапов} % или оставь пустым
\\renewcommand{\\footrulewidth}{0.4pt}

\\begin{document}
\\begin{center}
{\\LARGE Подборка задач}
\\end{center}
\\vspace{0.5em}
`.trim()

  const body = tasks.map((t, i) => {
    const parts: string[] = []
    if (t.sourceName) parts.push(latexEscape(t.sourceName))
    if (t.year) parts.push(String(t.year))
    if (typeof t.grade === "number") parts.push(`${t.grade} класс`)

    const meta = parts.length ? ` \\textit{(${parts.join(", ")})}` : ""
    const title = latexEscape(t.title)

    return `
\\noindent\\textbf{Задача ${i + 1}.}${meta} ${title}
\\vspace{0.5em}
`.trim()
  }).join("\n\n")

  const footer = "\n\\end{document}\n"

  return `${header}\n\n${body}${footer}`
}
