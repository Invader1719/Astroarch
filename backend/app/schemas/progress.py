from pydantic import BaseModel, ConfigDict


class ProgressCellIn(BaseModel):
    olympiad: str
    year: int
    grade: int


class ProgressCellOut(BaseModel):
    olympiad: str
    year: int
    grade: int
    model_config = ConfigDict(from_attributes=True)
