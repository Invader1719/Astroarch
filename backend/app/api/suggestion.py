from fastapi import APIRouter, Depends, HTTPException, Query, Security
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import SessionLocal
from app.schemas.suggestion import SuggestionCreate, SuggestionReview, SuggestionOut
from app.crud import suggestion as crud_suggestion
from app.crud.task import get_task
from app.dependencies.auth import require_role
from app.dependencies.users import get_current_user
from app.models.user import User

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/tasks/{task_id}/suggestions/", response_model=SuggestionOut)
def create_suggestion(
    task_id: int,
    data: SuggestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not get_task(db, task_id):
        raise HTTPException(status_code=404, detail="Задача не найдена")
    text = data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст предложения не может быть пустым")
    return crud_suggestion.create_suggestion(db, task_id, current_user.id, text)


@router.get("/suggestions/mine", response_model=List[SuggestionOut])
def list_my_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_suggestion.get_user_suggestions(db, current_user.id)


@router.get("/suggestions/", response_model=List[SuggestionOut])
def list_suggestions(
    status: Optional[str] = Query(None, pattern="^(pending|accepted|rejected)$"),
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("moderator", "admin", "founder")),
):
    return crud_suggestion.get_all_suggestions(db, status)


@router.patch("/suggestions/{suggestion_id}", response_model=SuggestionOut)
def review_suggestion(
    suggestion_id: int,
    data: SuggestionReview,
    db: Session = Depends(get_db),
    current_user: User = Security(require_role("moderator", "admin", "founder")),
):
    if data.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Статус должен быть accepted или rejected")
    suggestion = crud_suggestion.get_suggestion(db, suggestion_id)
    if not suggestion:
        raise HTTPException(status_code=404, detail="Предложение не найдено")
    return crud_suggestion.review_suggestion(db, suggestion, data.status, data.admin_comment, current_user.id)
