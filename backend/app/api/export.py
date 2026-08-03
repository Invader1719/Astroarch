# app/api/export.py
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.schemas.task import TaskIdsRequest
from app.crud.task import get_tasks_by_ids
from app.services.tex_export import build_tex_zip, build_standalone_tex

router = APIRouter(prefix="/export", tags=["export"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/tex", response_class=StreamingResponse)
def export_tex(
    payload: TaskIdsRequest,
    db: Session = Depends(get_db),
):
    tasks = get_tasks_by_ids(db, payload.task_ids)
    if not tasks:
        raise HTTPException(status_code=404, detail="Задачи не найдены")

    buf = build_tex_zip(
        tasks,
        db,
        meta=None,
        zip_name="tasks_tex.zip",
        include_source=payload.include_source,
        include_answer=payload.include_answer,
        include_solution=payload.include_solution,
    )
    headers = {
        "Content-Disposition": 'attachment; filename="tasks_tex.zip"'
    }
    return StreamingResponse(buf, media_type="application/zip", headers=headers)


@router.post("/tex/file", response_class=StreamingResponse)
def export_tex_file(
    payload: TaskIdsRequest,
    db: Session = Depends(get_db),
):
    """Один самодостаточный .tex файл (шапка вшита внутрь) — кнопка "Скачать LaTeX"."""
    tasks = get_tasks_by_ids(db, payload.task_ids)
    if not tasks:
        raise HTTPException(status_code=404, detail="Задачи не найдены")

    content = build_standalone_tex(
        tasks,
        db,
        include_source=payload.include_source,
        include_answer=payload.include_answer,
        include_solution=payload.include_solution,
    )
    buf = BytesIO(content.encode("utf-8"))
    headers = {
        "Content-Disposition": 'attachment; filename="astro-tasks.tex"'
    }
    return StreamingResponse(buf, media_type="application/x-tex", headers=headers)
