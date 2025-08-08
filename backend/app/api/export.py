# app/api/export.py
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List

from app.core.security import require_role  # или твой метод
from app.schemas.task import TaskFilter  # опиши фильтры (см. ниже)
from app.crud.task import get_tasks_for_export  # реализуем шагом ниже
from app.services.tex_export import build_tex_zip

router = APIRouter(prefix="/export", tags=["export"])

@router.post("/tex", response_class=StreamingResponse)
async def export_tex(
    filters: TaskFilter
):
    tasks = await get_tasks_for_export(filters)
    buf = build_tex_zip(tasks, meta=None, zip_name="tasks_tex.zip")
    headers = {
        "Content-Disposition": 'attachment; filename="tasks_tex.zip"'
    }
    return StreamingResponse(buf, media_type="application/zip", headers=headers)
