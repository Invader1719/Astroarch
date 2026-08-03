from fastapi import APIRouter, Depends, HTTPException, Security
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.topic import TopicCreate, TopicOut
from app.crud import topic as crud_topic
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/topics/", response_model=TopicOut)
def create_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    name = topic.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название темы не может быть пустым")
    if crud_topic.get_topic_by_name(db, name):
        raise HTTPException(status_code=409, detail="Тема с таким названием уже существует")
    return crud_topic.create_topic(db, topic)

@router.get("/topics/", response_model=List[TopicOut])
def get_topics(db: Session = Depends(get_db)):
    return crud_topic.get_all_topics(db)

@router.patch("/topics/{topic_id}", response_model=TopicOut)
def update_topic(
    topic_id: int,
    topic: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_topic = crud_topic.get_topic(db, topic_id)
    if not db_topic:
        raise HTTPException(status_code=404, detail="Тема не найдена")
    name = topic.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название темы не может быть пустым")
    existing = crud_topic.get_topic_by_name(db, name)
    if existing and existing.id != topic_id:
        raise HTTPException(status_code=409, detail="Тема с таким названием уже существует")
    return crud_topic.update_topic(db, db_topic, name)

@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("admin", "founder")),
):
    db_topic = crud_topic.get_topic(db, topic_id)
    if not db_topic:
        raise HTTPException(status_code=404, detail="Тема не найдена")
    # темы прикреплены к задачам через связь many-to-many (task_topic) — при
    # db.delete() SQLAlchemy сам вычищает строки в task_topic, поэтому
    # IntegrityError тут никогда не сработает, проверяем явно
    if db_topic.tasks:
        raise HTTPException(
            status_code=409,
            detail="Нельзя удалить — тема используется в задачах или содержит подтемы",
        )
    try:
        crud_topic.delete_topic(db, db_topic)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Нельзя удалить — тема используется в задачах или содержит подтемы",
        )
