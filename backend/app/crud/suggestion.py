from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from app.models.task_suggestion import TaskSuggestion


def _with_relations(query):
    return query.options(
        joinedload(TaskSuggestion.task),
        joinedload(TaskSuggestion.user),
        joinedload(TaskSuggestion.reviewed_by),
    )


def create_suggestion(db: Session, task_id: int, user_id: int, text: str):
    suggestion = TaskSuggestion(task_id=task_id, user_id=user_id, text=text, status="pending")
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return suggestion


def get_suggestion(db: Session, suggestion_id: int):
    return _with_relations(db.query(TaskSuggestion)).filter(TaskSuggestion.id == suggestion_id).first()


def get_all_suggestions(db: Session, status: Optional[str] = None):
    q = _with_relations(db.query(TaskSuggestion))
    if status:
        q = q.filter(TaskSuggestion.status == status)
    return q.order_by(TaskSuggestion.created_at.desc()).all()


def get_user_suggestions(db: Session, user_id: int):
    return (
        _with_relations(db.query(TaskSuggestion))
        .filter(TaskSuggestion.user_id == user_id)
        .order_by(TaskSuggestion.created_at.desc())
        .all()
    )


def review_suggestion(db: Session, suggestion: TaskSuggestion, status: str, admin_comment: Optional[str], reviewer_id: int):
    suggestion.status = status
    suggestion.admin_comment = admin_comment
    suggestion.reviewed_by_user_id = reviewer_id
    suggestion.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(suggestion)
    return suggestion
