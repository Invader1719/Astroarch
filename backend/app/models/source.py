from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)              # например: "ВАОШ"
    year = Column(Integer, nullable=True)              # например: 2023
    round = Column(String, nullable=True)              # например: "финал", "регион"
    grade = Column(Integer, nullable=True)             # для какого класса
