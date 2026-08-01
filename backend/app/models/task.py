from sqlalchemy import Column, Integer, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.task_topic import task_topic
from app.models.task_subtopic import task_subtopic

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    solution = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    difficulty = Column(Integer, nullable=False)
    grade = Column(Integer, nullable=True)  # класс, для которого задача (9/10/11) — атрибут задачи, не источника
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    topics = relationship("Topic", secondary=task_topic, backref="tasks")
    subtopics = relationship("Subtopic", secondary=task_subtopic, backref="tasks")
    source = relationship("Source")  # ← вот это важно для фильтрации по классу
    author = relationship("Author", back_populates="tasks")
    created_by_user = relationship("User")
