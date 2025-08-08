from pydantic import BaseModel
from typing import Optional

class SourceBase(BaseModel):
    name: str
    year: Optional[int] = None
    round: Optional[str] = None
    grade: Optional[int] = None

class SourceCreate(SourceBase):
    pass

class SourceOut(SourceBase):
    id: int

    class Config:
        orm_mode = True