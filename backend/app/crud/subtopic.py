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

def get_subtopic(db: Session, subtopic_id: int):
    return db.query(Subtopic).filter(Subtopic.id == subtopic_id).first()

def get_subtopic_by_name(db: Session, topic_id: int, name: str):
    return db.query(Subtopic).filter(Subtopic.topic_id == topic_id, Subtopic.name == name).first()

def update_subtopic(db: Session, db_subtopic: Subtopic, name: str, topic_id: int):
    db_subtopic.name = name
    db_subtopic.topic_id = topic_id
    db.commit()
    db.refresh(db_subtopic)
    return db_subtopic

def delete_subtopic(db: Session, db_subtopic: Subtopic):
    db.delete(db_subtopic)
    db.commit()
