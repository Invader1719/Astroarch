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
