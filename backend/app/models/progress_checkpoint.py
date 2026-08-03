from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.core.database import Base


class ProgressCheckpoint(Base):
    """Отмеченные клетки трекера прогресса (олимпиада, год, класс).
    Таблица хранит только ОТМЕЧЕННЫЕ клетки — отсутствие строки значит "не отмечено".
    """
    __tablename__ = "progress_checkpoints"

    id = Column(Integer, primary_key=True, index=True)
    olympiad = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    grade = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("olympiad", "year", "grade", name="uq_progress_checkpoint_cell"),
    )
