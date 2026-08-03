# app/services/tex_export.py
import os
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from typing import Iterable, Optional, Dict, List

from sqlalchemy.orm import Session

from app.services.task_images import UPLOAD_DIR, build_caption, find_image_ids, replace_image_tokens
from app.crud.task_image import get_task_image

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
\usepackage{needspace}
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

\usepackage{graphicx,caption} % про картинки

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
\lfoot{Тема: __TOPIC_LABEL__}
\cfoot{Листок по астрономии}
\rfoot{Станислав Потапов} % или оставь пустым
\renewcommand{\footrulewidth}{0.4pt}
""".strip()


# ===== 1a) Подпись темы в нижнем колонтитуле =====
_TOPIC_LABEL_MAX_LEN = len("Движение Луны и планет")  # длиннее — не влезает в колонтитул, ставим "Астрономия"


def compute_topic_label(tasks: Iterable) -> str:
    """
    Если среди задач ровно одна уникальная подтема — пишем её.
    Если подтем несколько, но все из одной темы — пишем тему.
    Если тем несколько (или тем/подтем нет вовсе) — общее "Астрономия".
    Если получившееся название длиннее эталонной фразы — тоже "Астрономия".
    """
    subtopic_names: Dict[int, str] = {}
    for t in tasks:
        for st in getattr(t, "subtopics", None) or []:
            sid, sname = getattr(st, "id", None), getattr(st, "name", None)
            if sid is not None and sname:
                subtopic_names[sid] = sname
    if len(subtopic_names) == 1:
        label = next(iter(subtopic_names.values()))
        return label if len(label) <= _TOPIC_LABEL_MAX_LEN else "Астрономия"

    topic_names: Dict[int, str] = {}
    for t in tasks:
        for tp in getattr(t, "topics", None) or []:
            tid, tname = getattr(tp, "id", None), getattr(tp, "name", None)
            if tid is not None and tname:
                topic_names[tid] = tname
    if len(topic_names) == 1:
        label = next(iter(topic_names.values()))
        return label if len(label) <= _TOPIC_LABEL_MAX_LEN else "Астрономия"

    return "Астрономия"


def render_header_tex(topic_label: str) -> str:
    return HEADER_TEX.replace("__TOPIC_LABEL__", tex_escape(topic_label))


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
def format_grade_label(grades) -> str:
    """
    Сквозная задача может быть отмечена сразу для нескольких классов —
    склеиваем их в компактную подпись: "9 класс" / "9–11 классы" (подряд
    идущие) / "9, 11 классы" (вразнобой).
    """
    g = sorted(set(grades or []))
    if not g:
        return ""
    if len(g) == 1:
        return f"{g[0]} класс"
    if g == list(range(g[0], g[-1] + 1)):
        return f"{g[0]}–{g[-1]} классы"
    return ", ".join(str(x) for x in g) + " классы"


def build_source_label(task) -> str:
    """
    Собираем подпись источника: название источника + год + класс(ы) задачи
    (год и класс — атрибуты самой задачи, а не источника, см. app/models/task.py).
    """
    parts = []
    if getattr(task, "source", None) and getattr(task.source, "name", None):
        parts.append(str(task.source.name))
    if getattr(task, "year", None):
        parts.append(str(task.year))
    grade_label = format_grade_label(getattr(task, "grades", None))
    if grade_label:
        parts.append(grade_label)
    if parts:
        return ", ".join(parts)
    # Фоллбек, если источник хранится как текстовое поле
    if getattr(task, "source_text", None):
        return str(task.source_text)
    return ""


def _image_path_resolver(db: Session):
    """
    Для ZIP/.tex-экспорта картинка компилируется НЕ на нашем сервере —
    поэтому \includegraphics должен ссылаться на относительное имя файла
    (лежит рядом с .tex внутри архива), а не на абсолютный путь на сервере,
    см. build_tex_zip.
    """
    def _resolve(image_id: int) -> Optional[str]:
        img = get_task_image(db, image_id)
        return img.filename if img else None
    return _resolve


def format_task_block(
    idx: int,
    task,
    db: Session,
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

    caption = build_caption(idx, tex_escape(title) if title else None)
    path_for_id = _image_path_resolver(db)

    # task.text/answer/solution уже хранятся как LaTeX-код (см. app/seed_data.py), поэтому не экранируем
    statement = getattr(task, "statement", "") or getattr(task, "text", "")
    statement = replace_image_tokens(statement, path_for_id, caption)
    block = prefix + " " + statement
    answer = getattr(task, "answer", None)
    if include_answer and answer:
        answer = replace_image_tokens(answer, path_for_id, caption)
        block += "\n\n" + rf"\vspace{{0.5em}}\noindent{{\itshape Ответ: {answer}\par}}"
    solution = getattr(task, "solution", None)
    if include_solution and solution:
        solution = replace_image_tokens(solution, path_for_id, caption)
        block += "\n\n" + rf"\vspace{{0.5em}}\noindent{{\itshape Решение: {solution}\par}}"
    return block + "\n\\vspace{0.5em}\n"


def _collect_image_ids(tasks: Iterable, include_answer: bool, include_solution: bool):
    """Только id картинок, которые реально попадут в вывод (с учётом include_*)."""
    ids = set()
    for t in tasks:
        ids |= find_image_ids(getattr(t, "text", None))
        if include_answer:
            ids |= find_image_ids(getattr(t, "answer", None))
        if include_solution:
            ids |= find_image_ids(getattr(t, "solution", None))
    return ids


def build_main_tex(
    tasks: Iterable,
    db: Session,
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
        tasks_tex.append(format_task_block(i, t, db, include_source, include_answer, include_solution))

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
    db: Session,
    meta: Optional[Dict[str, str]] = None,
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> str:
    """
    Один самодостаточный .tex файл — шапка вшита прямо в документ, без
    отдельного header.tex (для кнопки "Скачать LaTeX", в отличие от
    build_tex_zip, который кладёт шапку отдельным файлом в архив).

    ВАЖНО: если в задачах есть картинки — сами файлы сюда НЕ прикладываются
    (это один файл, не архив), \includegraphics будет ссылаться на
    несуществующий у пользователя файл. Для задач с картинками используйте
    build_tex_zip.
    """
    tasks = list(tasks)
    body = "".join(
        format_task_block(i, t, db, include_source, include_answer, include_solution)
        for i, t in enumerate(tasks, start=1)
    )
    return (
        r"\documentclass[a4paper,12pt]{article}" + "\n"
        + render_header_tex(compute_topic_label(tasks)) + "\n\n"
        r"\begin{document}" + "\n\n"
        f"{body}\n"
        r"\end{document}" + "\n"
    )


# ===== 4) Собираем ZIP =====
def build_tex_zip(
    tasks: Iterable,
    db: Session,
    meta: Optional[Dict[str, str]] = None,
    zip_name: str = "tasks_tex.zip",
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
) -> BytesIO:
    tasks = list(tasks)
    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        zf.writestr("header.tex", render_header_tex(compute_topic_label(tasks)) + "\n")
        zf.writestr(
            "main.tex",
            build_main_tex(tasks, db, meta, include_source, include_answer, include_solution),
        )
        # кладём сами файлы картинок рядом с .tex, чтобы архив компилировался
        # автономно у пользователя (без доступа к нашему серверу)
        for image_id in _collect_image_ids(tasks, include_answer, include_solution):
            img = get_task_image(db, image_id)
            if not img:
                continue
            path = os.path.join(UPLOAD_DIR, img.filename)
            if os.path.isfile(path):
                zf.write(path, img.filename)
    buf.seek(0)
    return buf
