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
    search: Optional[str] = Query(None),
    sources: Optional[List[str]] = Query(None),
    grades: Optional[List[int]] = Query(None),
    topic_ids: Optional[List[int]] = Query(None),
    subtopic_ids: Optional[List[int]] = Query(None),
    author_ids: Optional[List[int]] = Query(None),
    difficulty_min: Optional[int] = Query(None),
    difficulty_max: Optional[int] = Query(None),
    difficulties: Optional[List[int]] = Query(None),
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
    years: Optional[List[int]] = Query(None),
    sort_by: Optional[str] = Query(None, pattern="^(difficulty|year|created_at|author)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    return crud_task.get_all_tasks(
        db,
        search=search,
        sources=sources,
        grades=grades,
        topic_ids=topic_ids,
        subtopic_ids=subtopic_ids,
        author_ids=author_ids,
        difficulty_min=difficulty_min,
        difficulty_max=difficulty_max,
        difficulties=difficulties,
        year_min=year_min,
        year_max=year_max,
        years=years,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

@router.get("/tasks/years/", response_model=List[int])
def get_task_years(db: Session = Depends(get_db)):
    """Уникальные годы олимпиады (Task.year) среди существующих задач, вне зависимости от фильтров."""
    return crud_task.get_distinct_years(db)

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
    current_user: User = Security(require_role("admin", "moderator", "founder")),
):
    return crud_task.create_task(db, task, current_user.id)

@router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "moderator", "founder")),
):
    db_task = crud_task.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud_task.update_task(db, db_task, task)

@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "moderator", "founder")),
):
    db_task = crud_task.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    crud_task.delete_task(db, db_task)
