from pydantic import BaseModel

class SubtopicBase(BaseModel):
    name: str
    topic_id: int

class SubtopicCreate(SubtopicBase):
    pass

class SubtopicOut(SubtopicBase):
    id: int

    class Config:
        orm_mode = True
