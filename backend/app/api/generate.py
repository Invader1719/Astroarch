from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from typing import List, Optional
from app.core.database import SessionLocal
from app.models.task import Task
from app.models.topic import Topic
from app.services.pdf_generator import generate_tex_file, compile_tex_to_pdf
import uuid
import os

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/generate/")
def generate_pdf(
    task_ids: Optional[List[int]] = Query(None),
    topic_ids: Optional[List[int]] = Query(None),
    source_id: Optional[int] = None,
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Task)

    if task_ids:
        # выбор конкретных задач (чекбоксы на странице /tasks) — приоритетный путь
        query = query.filter(Task.id.in_(task_ids))
    else:
        if source_id:
            query = query.filter(Task.source_id == source_id)

        if topic_ids:
            query = query.join(Task.topics).filter(Topic.id.in_(topic_ids))

        if grade:
            query = query.filter(Task.grade == grade)

    tasks = query.limit(50).all()

    if not tasks:
        raise HTTPException(status_code=404, detail="Задачи не найдены по заданным фильтрам")

    filename = f"tasks_{uuid.uuid4().hex[:8]}"
    tex_path = os.path.join("generated", f"{filename}.tex")

    generate_tex_file(tasks, tex_path)
    pdf_path = compile_tex_to_pdf(tex_path)

    return FileResponse(pdf_path, media_type="application/pdf", filename="tasks.pdf")
