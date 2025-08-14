from pydantic import BaseModel, ConfigDict

class SubtopicBase(BaseModel):
    name: str
    topic_id: int

class SubtopicCreate(SubtopicBase):
    pass

class SubtopicOut(SubtopicBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
