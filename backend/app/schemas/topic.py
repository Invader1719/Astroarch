from pydantic import BaseModel, ConfigDict
from typing import Optional

class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None

class TopicCreate(TopicBase):
    pass

class TopicOut(TopicBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
