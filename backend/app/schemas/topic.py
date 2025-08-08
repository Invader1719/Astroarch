from pydantic import BaseModel

class TopicBase(BaseModel):
    name: str

class TopicCreate(TopicBase):
    pass

class TopicOut(TopicBase):
    id: int

    class Config:
        orm_mode = True
