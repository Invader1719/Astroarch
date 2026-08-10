from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
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
    current_user: User = Security(require_role("admin", "moderator", "founder")),
):
    name = source.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название источника не может быть пустым")
    if crud_source.get_source_by_name(db, name):
        raise HTTPException(status_code=409, detail="Источник с таким названием уже существует")
    return crud_source.create_source(db, source)

@router.get("/sources/", response_model=List[SourceOut])
def get_sources(db: Session = Depends(get_db)):
    return crud_source.get_all_sources(db)

@router.patch("/sources/{source_id}", response_model=SourceOut)
def update_source(
    source_id: int,
    source: SourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_source = crud_source.get_source(db, source_id)
    if not db_source:
        raise HTTPException(status_code=404, detail="Источник не найден")
    name = source.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название источника не может быть пустым")
    existing = crud_source.get_source_by_name(db, name)
    if existing and existing.id != source_id:
        raise HTTPException(status_code=409, detail="Источник с таким названием уже существует")
    return crud_source.update_source(db, db_source, name, source.description)

@router.delete("/sources/{source_id}", status_code=204)
def delete_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_source = crud_source.get_source(db, source_id)
    if not db_source:
        raise HTTPException(status_code=404, detail="Источник не найден")
    try:
        crud_source.delete_source(db, db_source)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Нельзя удалить — источник используется в задачах")

@router.get("/grades/", response_model=List[int])
def get_grades(db: Session = Depends(get_db)):
    # grades — ARRAY(Integer); unnest разворачивает массивы в отдельные строки
    rows = db.query(func.unnest(Task.grades)).distinct().all()
    return sorted(r[0] for r in rows if r[0] is not None)
