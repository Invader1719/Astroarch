from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserPublic


class SuggestionCreate(BaseModel):
    text: str


class SuggestionReview(BaseModel):
    status: str  # "accepted" | "rejected"
    admin_comment: Optional[str] = None


class SuggestionTaskShort(BaseModel):
    id: int
    title: Optional[str] = None
    text: str
    model_config = ConfigDict(from_attributes=True)


class SuggestionOut(BaseModel):
    id: int
    task_id: int
    text: str
    status: str
    admin_comment: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    task: Optional[SuggestionTaskShort] = None
    user: Optional[UserPublic] = None
    reviewed_by: Optional[UserPublic] = None
    model_config = ConfigDict(from_attributes=True)
