from pydantic import BaseModel, ConfigDict

class SourceBase(BaseModel):
    name: str

class SourceCreate(SourceBase):
    pass

class SourceOut(SourceBase):
    id: int
    # Pydantic v2: включаем чтение из ORM объектов
    model_config = ConfigDict(from_attributes=True)
