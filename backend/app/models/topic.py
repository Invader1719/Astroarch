from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    # необязательное пояснение темы (например, для "Математика"/"Физика" —
    # что это за темы и почему задачи в них выходят за рамки стандартных
    # приёмов); показывается по клику на значок "ⓘ" рядом с темой
    description = Column(Text, nullable=True)
