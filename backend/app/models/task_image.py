from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class TaskImage(Base):
    """
    Загруженная картинка для условия/решения/ответа задачи.
    task_id проставляется задним числом при сохранении задачи (см.
    app/crud/task.py) — на момент загрузки картинки задача может ещё не
    существовать (форма создания задачи).
    filename — имя файла на диске в app/services/task_images.py:UPLOAD_DIR,
    вида "{id}.png".
    """
    __tablename__ = "task_images"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
