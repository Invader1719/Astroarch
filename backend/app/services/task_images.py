# app/services/task_images.py
"""
Общая логика для картинок в задачах — используется и прямым PDF
(app/services/pdf_generator.py), и ZIP/.tex-экспортом
(app/services/tex_export.py), и веб-рендером (косвенно — фронт
использует тот же токен [[img:ID|width=W]] в своём регэкспе).
"""
import os
import re
from typing import Callable, Optional, Set

# Файлы лежат рядом с backend/, относительный путь — как OUTPUT_DIR в
# pdf_generator.py (процесс всегда запускается с cwd=backend/).
UPLOAD_DIR = "uploads/task_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# [[img:47]] или [[img:47|width=0.5]] — width в долях \linewidth, по умолчанию 0.7
IMG_TOKEN_RE = re.compile(r"\[\[img:(\d+)(?:\|width=([0-9.]+))?\]\]")


def find_image_ids(text: Optional[str]) -> Set[int]:
    if not text:
        return set()
    return {int(m.group(1)) for m in IMG_TOKEN_RE.finditer(text)}


def build_caption(idx: int, escaped_title: Optional[str]) -> str:
    """escaped_title — уже экранированное (под LaTeX) название задачи."""
    if escaped_title:
        return f"К задаче {idx}. {escaped_title}."
    return f"К задаче {idx}."


def replace_image_tokens(
    text: Optional[str],
    path_for_id: Callable[[int], Optional[str]],
    caption: str,
) -> Optional[str]:
    """
    Заменяет [[img:ID|width=W]] на не-плавающий (без figure/wrapfig) блок:
    картинка + подпись, обёрнутые в \needspace, чтобы блок не резался
    посередине на границе страницы, но и не "уезжал" от места в тексте.
    path_for_id(image_id) должен вернуть путь/имя файла для \includegraphics
    (абсолютный — для прямого PDF на сервере; относительное имя файла —
    для ZIP-экспорта, где сам файл кладётся рядом с .tex).
    Если path_for_id вернул None (картинка не найдена) — токен просто
    убирается, ничего не подставляем.
    """
    if not text:
        return text

    def _sub(m: "re.Match[str]") -> str:
        image_id = int(m.group(1))
        width = m.group(2) or "0.7"
        path = path_for_id(image_id)
        if not path:
            return ""
        return (
            r"\par\needspace{6cm}\begin{center}" "\n"
            rf"\includegraphics[width={width}\linewidth]{{{path}}}\\[0.3em]" "\n"
            rf"{{\small {caption}}}" "\n"
            r"\end{center}\par" "\n"
        )

    return IMG_TOKEN_RE.sub(_sub, text)
