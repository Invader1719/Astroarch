from pydantic import BaseModel, ConfigDict

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
    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    nickname: str
    password: str
