from pydantic import BaseModel, ConfigDict


class TaskImageOut(BaseModel):
    id: int
    filename: str
    content_type: str
    size: int
    model_config = ConfigDict(from_attributes=True)
