from sqlalchemy import Column, Integer, Text, String, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class TaskSuggestion(Base):
    """Предложение изменения к задаче от пользователя (просто текст —
    что и как поменять), которое модератор/админ принимает или отклоняет."""

    __tablename__ = "task_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending | accepted | rejected
    admin_comment = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    reviewed_at = Column(TIMESTAMP, nullable=True)

    task = relationship("Task")
    user = relationship("User", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
