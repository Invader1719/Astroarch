import os
import shutil
import subprocess
from types import SimpleNamespace
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from app.models.task import Task
from app.services.tex_export import compute_topic_label, format_grade_label, tex_escape
from app.services.task_images import UPLOAD_DIR, build_caption, replace_image_tokens
from app.crud.task_image import get_task_image
from typing import List, Optional

TEMPLATE_DIR = "tex_templates"
OUTPUT_DIR = "generated"

os.makedirs(OUTPUT_DIR, exist_ok=True)

env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


def _find_tectonic() -> str:
    """Ищем бинарь tectonic: сначала в PATH (так он есть в Docker-образе), затем
    в типичных местах установки без прав root (актуально для bare-metal деплоя,
    где PATH systemd-сервиса не включает пользовательские каталоги)."""
    found = shutil.which("tectonic")
    if found:
        return found
    for candidate in (
        os.path.expanduser("~/bin/tectonic"),
        os.path.expanduser("~/.local/bin/tectonic"),
        "/usr/local/bin/tectonic",
    ):
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return "tectonic"  # не найден нигде — subprocess сам бросит понятную ошибку


TECTONIC_BIN = _find_tectonic()


def _resolve_task_images(db: Session, idx: int, task: Task) -> SimpleNamespace:
    """
    Возвращает "облегчённую" версию задачи для Jinja-шаблона, где в
    text/answer/solution токены [[img:ID|width=W]] уже заменены на
    \includegraphics с абсолютным путём (компиляция идёт на этом же
    сервере, так что абсолютный путь — не проблема, в отличие от
    ZIP-экспорта, см. app/services/tex_export.py).
    """
    title = getattr(task, "title", None)
    caption = build_caption(idx, tex_escape(title) if title else None)

    def path_for_id(image_id: int) -> Optional[str]:
        img = get_task_image(db, image_id)
        if not img:
            return None
        return os.path.abspath(os.path.join(UPLOAD_DIR, img.filename))

    return SimpleNamespace(
        title=title,
        source=getattr(task, "source", None),
        year=getattr(task, "year", None),
        grade_label=format_grade_label(getattr(task, "grades", None)),
        text=replace_image_tokens(task.text, path_for_id, caption),
        answer=replace_image_tokens(getattr(task, "answer", None), path_for_id, caption),
        solution=replace_image_tokens(getattr(task, "solution", None), path_for_id, caption),
    )


def generate_tex_file(
    tasks: List[Task],
    tex_path: str,
    db: Session,
    include_source: bool = True,
    include_answer: bool = False,
    include_solution: bool = False,
):
    rendered_tasks = [_resolve_task_images(db, i, t) for i, t in enumerate(tasks, start=1)]

    template = env.get_template("base_template.tex")
    tex_content = template.render(
        tasks=rendered_tasks,
        include_source=include_source,
        include_answer=include_answer,
        include_solution=include_solution,
        topic_label=tex_escape(compute_topic_label(tasks)),
    )
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)

def compile_tex_to_pdf(tex_path: str) -> str:
    pdf_path = tex_path.replace(".tex", ".pdf")
    subprocess.run([TECTONIC_BIN, tex_path, "--outdir", OUTPUT_DIR], check=True)
    return pdf_path
