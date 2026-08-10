from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base

class Source(Base):
    """Источник — просто место/олимпиада (например: "ВсОШ. Закл", "ВсОШ. Рег").
    Год и класс — атрибуты самой задачи (Task.year, Task.grade), не источника:
    один и тот же источник может использоваться для задач разных лет и классов."""
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    # необязательное пояснение источника (например, для "МАО. Доп. задачи" —
    # откуда вообще взялись эти задачи и чем они отличаются от обычных туров
    # олимпиады); показывается по клику на значок "ⓘ" рядом с источником
    description = Column(Text, nullable=True)
