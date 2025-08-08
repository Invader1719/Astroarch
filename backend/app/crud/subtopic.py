from sqlalchemy.orm import Session
from app.models.subtopic import Subtopic
from app.schemas.subtopic import SubtopicCreate

def create_subtopic(db: Session, subtopic: SubtopicCreate):
    db_subtopic = Subtopic(**subtopic.dict())
    db.add(db_subtopic)
    db.commit()
    db.refresh(db_subtopic)
    return db_subtopic

def get_all_subtopics(db: Session):
    return db.query(Subtopic).all()
