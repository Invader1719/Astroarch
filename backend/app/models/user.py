from sqlalchemy import Column, Integer, String, Text
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    nickname = Column(String, unique=True, nullable=False, index=True)
    password = Column(Text, nullable=False)
    role = Column(String, default="guest")
    lumina = Column(Integer, default=0)
