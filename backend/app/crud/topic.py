from sqlalchemy.orm import Session
from app.models.topic import Topic
from app.schemas.topic import TopicCreate

def create_topic(db: Session, topic: TopicCreate):
    db_topic = Topic(**topic.dict())
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic

def get_all_topics(db: Session):
    return db.query(Topic).all()

def get_topic_by_name(db: Session, name: str):
    return db.query(Topic).filter(Topic.name == name).first()

def get_topic(db: Session, topic_id: int):
    return db.query(Topic).filter(Topic.id == topic_id).first()

def update_topic(db: Session, db_topic: Topic, name: str, description: str | None = None):
    db_topic.name = name
    db_topic.description = description
    db.commit()
    db.refresh(db_topic)
    return db_topic

def delete_topic(db: Session, db_topic: Topic):
    db.delete(db_topic)
    db.commit()
