from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Author(Base):
    __tablename__ = "authors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)

    # обратная сторона Task.authors (secondary=task_author) — см. app/models/task.py
