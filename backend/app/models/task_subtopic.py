from sqlalchemy import Table, Column, Integer, ForeignKey
from app.core.database import Base

task_subtopic = Table(
    "task_subtopic",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id")),
    Column("subtopic_id", Integer, ForeignKey("subtopics.id"))
)
