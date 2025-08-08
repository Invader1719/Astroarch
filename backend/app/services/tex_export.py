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
    Собираем подпись источника. Настрой под свою модель.
    Ожидается, что у task есть .source с полями name/year/stage/grade (если нет — адаптируй).
    """
    if getattr(task, "source", None):
        parts = []
        # Примеры — меняй под свои поля
        if getattr(task.source, "name", None):
            parts.append(str(task.source.name))
        if getattr(task.source, "stage", None):
            parts.append(str(task.source.stage))
        if getattr(task.source, "grade", None):
            parts.append(str(task.source.grade))
        if getattr(task.source, "year", None):
            parts.append(str(task.source.year))
        return ", ".join(parts)
    # Фоллбек, если источник хранится как текстовое поле
    if getattr(task, "source_text", None):
        return str(task.source_text)
    return ""


def format_task_block(idx: int, task) -> str:
    """
    Генерирует блок вида:
    \noindent\textbf{Задача 1.} \source{...} Условие...
    \vspace{0.5em}
    """
    source_label = build_source_label(task)
    prefix = rf"\noindent\textbf{{Задача {idx}.}}"
    if source_label:
        prefix += rf" \source{{{tex_escape(source_label)}}}"
    statement = tex_escape(getattr(task, "statement", "") or getattr(task, "text", ""))
    return prefix + " " + statement + "\n\\vspace{0.5em}\n"


def build_main_tex(tasks: Iterable, meta: Optional[Dict[str, str]] = None) -> str:
    """
    Собираем итоговый main.tex. meta можно потом использовать для динамических колонтитулов.
    """
    # Хочешь — сюда добавь динамику колонтитулов, прописав \lhead и т.д. через \fancypagestyle
    tasks_tex = []
    for i, t in enumerate(tasks, start=1):
        tasks_tex.append(format_task_block(i, t))

    body = "".join(tasks_tex)
    return (
        r"\documentclass[a4paper,12pt]{article}" + "\n"
        r"\input{header.tex}" + "\n\n"
        r"\begin{document}" + "\n\n"
        f"{body}\n"
        r"\end{document}" + "\n"
    )


# ===== 4) Собираем ZIP =====
def build_tex_zip(tasks: Iterable, meta: Optional[Dict[str, str]] = None, zip_name: str = "tasks_tex.zip") -> BytesIO:
    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        zf.writestr("header.tex", HEADER_TEX + "\n")
        zf.writestr("main.tex", build_main_tex(tasks, meta))
    buf.seek(0)
    return buf
