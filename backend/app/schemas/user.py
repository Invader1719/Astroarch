from pydantic import BaseModel

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    middle_name: str | None = None
    nickname: str
    password: str

class UserPublic(BaseModel):
    id: int
    first_name: str
    last_name: str
    middle_name: str | None = None
    nickname: str
    role: str
    lumina: int

    class Config:
        from_attributes = True  # заменяет устаревший orm_mode

class UserLogin(BaseModel):
    nickname: str
    password: str
