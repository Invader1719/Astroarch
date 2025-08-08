from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import SessionLocal
from app.schemas.subtopic import SubtopicCreate, SubtopicOut
from app.crud import subtopic as crud_subtopic

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/subtopics/", response_model=SubtopicOut)
def create_subtopic(subtopic: SubtopicCreate, db: Session = Depends(get_db)):
    return crud_subtopic.create_subtopic(db, subtopic)

@router.get("/subtopics/", response_model=List[SubtopicOut])
def get_subtopics(db: Session = Depends(get_db)):
    return crud_subtopic.get_all_subtopics(db)
