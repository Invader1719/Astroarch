from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.topic import TopicCreate, TopicOut
from app.crud import topic as crud_topic

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/topics/", response_model=TopicOut)
def create_topic(topic: TopicCreate, db: Session = Depends(get_db)):
    return crud_topic.create_topic(db, topic)

@router.get("/topics/", response_model=List[TopicOut])
def get_topics(db: Session = Depends(get_db)):
    return crud_topic.get_all_topics(db)
