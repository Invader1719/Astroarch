from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ====== Дополнительные схемы ======
class SourceBase(BaseModel):
    id: int
    name: str
    year: Optional[int] = None
    round: Optional[str] = None
    grade: Optional[int] = None

    class Config:
        orm_mode = True

class TopicBase(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class SubtopicBase(BaseModel):
    id: int
    name: str
    topic_id: int

    class Config:
        orm_mode = True

# ====== Существующие схемы ======
class TaskBase(BaseModel):
    text: str
    solution: Optional[str] = None
    answer: Optional[str] = None
    difficulty: int
    source_id: int
    topic_ids: Optional[List[int]] = []
    subtopic_ids: Optional[List[int]] = []

class TaskCreate(TaskBase):
    pass

class TaskOut(BaseModel):
    id: int
    text: str
    difficulty: int
    created_at: datetime
    solution: Optional[str]
    answer: Optional[str]
    source: Optional[SourceBase]
    author: Optional[str] = None
    topics: List[TopicBase] = []
    subtopics: List[SubtopicBase] = []

    class Config:
        from_attributes = True  # если Pydantic v2

class TaskFilter(BaseModel):
    year: Optional[int] = None
    source_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None
    subtopic_ids: Optional[List[int]] = None
    grade: Optional[int] = None
    difficulty_min: Optional[int] = None
    difficulty_max: Optional[int] = None
    # Дополнительно: include_solution/answer — если будешь добавлять в TeX