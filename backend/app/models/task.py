from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.task_topic import task_topic
from app.models.task_subtopic import task_subtopic
from app.models.task_author import task_author

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)  # короткое название задачи (необязательно), напр. "Улетающая звезда"
    text = Column(Text, nullable=False)
    solution = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    difficulty = Column(Integer, nullable=False)
    grades = Column(ARRAY(Integer), nullable=False)  # классы (сквозные задачи — может быть несколько)
    year = Column(Integer, nullable=False)   # год олимпиады — тоже атрибут задачи, не источника
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    topics = relationship("Topic", secondary=task_topic, backref="tasks")
    subtopics = relationship("Subtopic", secondary=task_subtopic, backref="tasks")
    source = relationship("Source")  # ← вот это важно для фильтрации по классу
    # у задачи может быть несколько авторов (соавторство) — раньше было author_id (один автор)
    authors = relationship("Author", secondary=task_author, backref="tasks")
    created_by_user = relationship("User")
