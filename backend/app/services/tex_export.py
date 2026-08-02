# app/services/tex_export.py
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from typing import Iterable, Optional, Dict

# ===== 1) Фиксированный header.tex =====
HEADER_TEX = r"""
% Минимальные поля
\usepackage[a4paper,top=2.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}

% Прикольный шрифт
\usepackage[T1]{fontenc}
\usepackage{cmbright}

% Язык
\usepackage[russian]{babel}
\usepackage[utf8]{inputenc}

% Математика и оформление
\usepackage{amsmath, amssymb, mathtools}
\usepackage{enumitem}
\usepackage{fancyhdr}
\usepackage{graphicx}
\usepackage{titlesec}

% Заголовки — компактные
\titleformat{\section}{\normalfont\large\bfseries}{\thesection:}{0.5em}{}
\titlespacing*{\section}{0pt}{0.8em}{0.3em}

% Подзаголовки (если будут)
\titleformat{\subsection}{\normalfont\normalsize\bfseries}{\thesubsection.}{0.5em}{}
\titlespacing*{\subsection}{0pt}{0.5em}{0.2em}

% Списки — компактные
\setlist[itemize]{noitemsep, topsep=0pt, left=1.2em}
\setlist[enumerate]{noitemsep, topsep=0pt, left=1.2em, label=\arabic*.}

% Макрос для красивого оформления источника
\newcommand{\source}[1]{\textit{(#1)}}

\usepackage{graphicx,wrapfig,caption,float} % про картинки

% компактные отступы вокруг обтекаемых рисунков и расстояние между колонками
\setlength{\intextsep}{0.5em}
\setlength{\columnsep}{1em}

% аккуратные подписи (не растягивать по ширине)
\captionsetup{font=small,labelfont=bf,justification=raggedright,singlelinecheck=false}

% Колонтитулы
\pagestyle{fancy}
\fancyhf{}
% Верхний
\lhead{Курс по олимпиадной астрономии}
\rhead{Страница \thepage}
\renewcommand{\headrulewidth}{0.4pt}
% Нижний
\lfoot{Тема: Планетные координаты}
\cfoot{Листок по астрономии}
\rfoot{Станислав Потапов} % или оставь пустым
\renewcommand{\footrulewidth}{0.4pt}
""".strip()


# ===== 2) Утилита экранирования =====
_LATEX_ESCAPES = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}

def tex_escape(text: Optional[str]) -> str:
    if not text:
        return ""
    out = []
    for ch in text:
        out.append(_LATEX_ESCAPES.get(ch, ch))
    return "".join(out)


# ===== 3) Строим main.tex по задачам =====
def build_source_label(task) -> str:
    """
    Собираем подпись источника: название источника + год + класс задачи
    (год и класс — атрибуты самой задачи, а не источника, см. app/models/task.py).
    """
    parts = []
    if getattr(task, "source", None) and getattr(task.source, "name", None):
        parts.append(str(task.source.name))
    if getattr(task, "year", None):
        parts.append(str(task.year))
    if getattr(task, "grade", None):
        parts.append(f"{task.grade} класс")
    if parts:
        return ", ".join(parts)
    # Фоллбек, если источник хранится как текстовое поле
    if getattr(task, "source_text", None):
        return str(task.source_text)
    return ""


def format_task_block(
    idx: int,
    task,
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> str:
    """
    Генерирует блок вида:
    \noindent\textbf{Задача 1.} \source{...} Условие...
    \vspace{0.5em}
    """
    source_label = build_source_label(task) if include_source else ""
    prefix = rf"\noindent\textbf{{Задача {idx}.}}"
    title = getattr(task, "title", None)
    if title:
        prefix += rf" \textbf{{{tex_escape(title)}}}."
    if source_label:
        prefix += rf" \source{{{tex_escape(source_label)}}}"
    # task.text/answer/solution уже хранятся как LaTeX-код (см. app/seed_data.py), поэтому не экранируем
    statement = getattr(task, "statement", "") or getattr(task, "text", "")
    block = prefix + " " + statement
    answer = getattr(task, "answer", None)
    if include_answer and answer:
        block += "\n\n" + rf"\vspace{{0.5em}}\noindent{{\itshape Ответ: {answer}\par}}"
    solution = getattr(task, "solution", None)
    if include_solution and solution:
        block += "\n\n" + rf"\vspace{{0.5em}}\noindent{{\itshape Решение: {solution}\par}}"
    return block + "\n\\vspace{0.5em}\n"


def build_main_tex(
    tasks: Iterable,
    meta: Optional[Dict[str, str]] = None,
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> str:
    """
    Собираем итоговый main.tex. meta можно потом использовать для динамических колонтитулов.
    """
    # Хочешь — сюда добавь динамику колонтитулов, прописав \lhead и т.д. через \fancypagestyle
    tasks_tex = []
    for i, t in enumerate(tasks, start=1):
        tasks_tex.append(format_task_block(i, t, include_source, include_answer, include_solution))

    body = "".join(tasks_tex)
    return (
        r"\documentclass[a4paper,12pt]{article}" + "\n"
        r"\input{header.tex}" + "\n\n"
        r"\begin{document}" + "\n\n"
        f"{body}\n"
        r"\end{document}" + "\n"
    )


def build_standalone_tex(
    tasks: Iterable,
    meta: Optional[Dict[str, str]] = None,
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> str:
    """
    Один самодостаточный .tex файл — шапка вшита прямо в документ, без
    отдельного header.tex (для кнопки "Скачать LaTeX", в отличие от
    build_tex_zip, который кладёт шапку отдельным файлом в архив).
    """
    body = "".join(
        format_task_block(i, t, include_source, include_answer, include_solution)
        for i, t in enumerate(tasks, start=1)
    )
    return (
        r"\documentclass[a4paper,12pt]{article}" + "\n"
        + HEADER_TEX + "\n\n"
        r"\begin{document}" + "\n\n"
        f"{body}\n"
        r"\end{document}" + "\n"
    )


# ===== 4) Собираем ZIP =====
def build_tex_zip(
    tasks: Iterable,
    meta: Optional[Dict[str, str]] = None,
    zip_name: str = "tasks_tex.zip",
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> BytesIO:
    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        zf.writestr("header.tex", HEADER_TEX + "\n")
        zf.writestr("main.tex", build_main_tex(tasks, meta, include_source, include_answer, include_solution))
    buf.seek(0)
    return buf
