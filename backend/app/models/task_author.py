from sqlalchemy import Table, Column, Integer, ForeignKey
from app.core.database import Base

task_author = Table(
    "task_author",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id")),
    Column("author_id", Integer, ForeignKey("authors.id"))
)
