import os
import shutil
import subprocess
from jinja2 import Environment, FileSystemLoader
from app.models.task import Task
from typing import List

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


def generate_tex_file(tasks: List[Task], tex_path: str, include_source: bool = True, include_answer: bool = True):
    template = env.get_template("base_template.tex")
    tex_content = template.render(tasks=tasks, include_source=include_source, include_answer=include_answer)
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(tex_content)

def compile_tex_to_pdf(tex_path: str) -> str:
    pdf_path = tex_path.replace(".tex", ".pdf")
    subprocess.run([TECTONIC_BIN, tex_path, "--outdir", OUTPUT_DIR], check=True)
    return pdf_path
