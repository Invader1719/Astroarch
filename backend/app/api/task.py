from fastapi import APIRouter, Depends, HTTPException, Query, Security
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import SessionLocal
from app.schemas.task import TaskOut, TaskCreate
from app.crud import task as crud_task
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/tasks/", response_model=List[TaskOut])
def read_tasks(
    year: Optional[int] = Query(None),
    sources: Optional[List[str]] = Query(None),
    grades: Optional[List[int]] = Query(None),
    topic_ids: Optional[List[int]] = Query(None),
    subtopic_ids: Optional[List[int]] = Query(None),
    db: Session = Depends(get_db),
):
    return crud_task.get_all_tasks(
        db,
        year=year,
        sources=sources,
        grades=grades,
        topic_ids=topic_ids,
        subtopic_ids=subtopic_ids,
    )

@router.get("/tasks/{task_id}", response_model=TaskOut)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud_task.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task

@router.post("/tasks/", response_model=TaskOut)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "moderator")),
):
    return crud_task.create_task(db, task, current_user.id)
