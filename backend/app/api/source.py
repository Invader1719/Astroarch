from fastapi import APIRouter, Depends, Security
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.source import SourceCreate, SourceOut
from app.crud import source as crud_source
from app.models.task import Task  # grade — атрибут задачи, не источника
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/sources/", response_model=SourceOut)
def create_source(
    source: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    return crud_source.create_source(db, source)

@router.get("/sources/", response_model=List[SourceOut])
def get_sources(db: Session = Depends(get_db)):
    return crud_source.get_all_sources(db)

@router.get("/grades/", response_model=List[int])
def get_grades(db: Session = Depends(get_db)):
    grades = db.query(Task.grade).distinct().all()
    return sorted(g[0] for g in grades if g[0] is not None)
