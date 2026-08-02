from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.subtopic import SubtopicCreate, SubtopicOut
from app.crud import subtopic as crud_subtopic
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/subtopics/", response_model=SubtopicOut)
def create_subtopic(
    subtopic: SubtopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    name = subtopic.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название подтемы не может быть пустым")
    if crud_subtopic.get_subtopic_by_name(db, subtopic.topic_id, name):
        raise HTTPException(status_code=409, detail="Такая подтема уже есть в этой теме")
    return crud_subtopic.create_subtopic(db, subtopic)

@router.get("/subtopics/", response_model=List[SubtopicOut])
def get_subtopics(db: Session = Depends(get_db)):
    return crud_subtopic.get_all_subtopics(db)

@router.patch("/subtopics/{subtopic_id}", response_model=SubtopicOut)
def update_subtopic(
    subtopic_id: int,
    subtopic: SubtopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_subtopic = crud_subtopic.get_subtopic(db, subtopic_id)
    if not db_subtopic:
        raise HTTPException(status_code=404, detail="Подтема не найдена")
    name = subtopic.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название подтемы не может быть пустым")
    existing = crud_subtopic.get_subtopic_by_name(db, subtopic.topic_id, name)
    if existing and existing.id != subtopic_id:
        raise HTTPException(status_code=409, detail="Такая подтема уже есть в этой теме")
    return crud_subtopic.update_subtopic(db, db_subtopic, name, subtopic.topic_id)

@router.delete("/subtopics/{subtopic_id}", status_code=204)
def delete_subtopic(
    subtopic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_subtopic = crud_subtopic.get_subtopic(db, subtopic_id)
    if not db_subtopic:
        raise HTTPException(status_code=404, detail="Подтема не найдена")
    try:
        crud_subtopic.delete_subtopic(db, db_subtopic)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Нельзя удалить — подтема используется в задачах")
