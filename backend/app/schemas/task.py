from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class AuthorShort(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class SourceShort(BaseModel):
    id: int
    name: str
    year: Optional[int] = None
    round: Optional[str] = None
    grade: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class TopicShort(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class SubtopicShort(BaseModel):
    id: int
    name: str
    topic_id: int
    model_config = ConfigDict(from_attributes=True)

# --- входные модели ---
class TaskBase(BaseModel):
    text: str
    solution: Optional[str] = None
    answer: Optional[str] = None
    difficulty: int
    grade: Optional[int] = None
    source_id: int
    author_id: Optional[int] = None                # ← НОВОЕ поле
    topic_ids: List[int] = Field(default_factory=list)
    subtopic_ids: List[int] = Field(default_factory=list)

class TaskCreate(TaskBase):
    pass

# --- выходная модель ---
class TaskOut(BaseModel):
    id: int
    text: str
    difficulty: int
    grade: Optional[int] = None
    created_at: datetime
    solution: Optional[str] = None
    answer: Optional[str] = None

    source: Optional[SourceShort] = None
    author: Optional[AuthorShort] = None           # ← заменили str на объект
    topics: List[TopicShort] = Field(default_factory=list)
    subtopics: List[SubtopicShort] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# фильтр (если используется)
class TaskFilter(BaseModel):
    year: Optional[int] = None
    source_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None
    subtopic_ids: Optional[List[int]] = None
    grade: Optional[int] = None
    difficulty_min: Optional[int] = None
    difficulty_max: Optional[int] = None


class TaskIdsRequest(BaseModel):
    """Список id выбранных пользователем задач — для экспорта в TeX/PDF."""
    task_ids: List[int] = Field(default_factory=list)
