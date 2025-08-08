from sqlalchemy import Table, Column, Integer, ForeignKey
from app.core.database import Base

task_topic = Table(
    "task_topic",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id")),
    Column("topic_id", Integer, ForeignKey("topics.id"))
)
